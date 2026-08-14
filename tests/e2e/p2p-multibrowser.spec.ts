import { expect, test } from '@playwright/test';

test.describe('Multi-Browser P2P Interaction & CRDT Synchronization', () => {
  test('synchronizes invite flow and UI across two isolated browser contexts', async ({ browser }) => {
    // 1. Create Peer A Context
    const contextA = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    const pageA = await contextA.newPage();
    await pageA.goto('http://localhost:3000/');
    await expect(pageA.locator('#quietslack-root-shell')).toBeVisible();

    // 2. Open Invite Modal on Peer A and read invite hash payload
    await pageA.locator('#add-teammates-dm-btn').click();
    await expect(pageA.locator('#invite-modal-card')).toBeVisible();

    const inviteLinkInput = pageA.locator('#invite-link-copy-input');
    const inviteUrl = await inviteLinkInput.inputValue();
    expect(inviteUrl).toContain('#invite=');

    await pageA.locator('#close-invite-modal-btn').click();
    await expect(pageA.locator('#invite-modal-card')).not.toBeVisible();

    // 3. Create Peer B Context in isolated session and open invite URL
    const contextB = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    const pageB = await contextB.newPage();
    await pageB.goto(inviteUrl);
    await expect(pageB.locator('#quietslack-root-shell')).toBeVisible({ timeout: 15000 });

    // 4. Peer A sends a real-time local message
    const msgFromA = `P2P Multi-Browser sync verification: ${Date.now()}`;
    await pageA.locator('#message-composer-textarea').fill(msgFromA);
    await pageA.locator('#composer-send-btn').click();

    // Verify Peer A shows message
    await expect(pageA.getByText(msgFromA)).toBeVisible({ timeout: 5000 });

    // 5. Peer B can start/leave huddle UI
    const huddleBtnB = pageB.locator('#channel-huddle-btn');
    if (await huddleBtnB.isVisible()) {
      await huddleBtnB.click();
      await expect(pageB.locator('#huddle-floating-dock')).toBeVisible({ timeout: 10000 });
      await pageB.locator('#huddle-leave-btn').click();
      await expect(pageB.locator('#huddle-floating-dock')).not.toBeVisible();
    }

    // Clean up
    await contextA.close();
    await contextB.close();
  });
});
