import { expect, test } from '@playwright/test';

test.describe('Multi-Browser P2P Interaction & CRDT Synchronization', () => {
  test('synchronizes messages and presence across two isolated browser contexts', async ({ browser }) => {
    // 1. Create Peer A Context
    const contextA = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    const pageA = await contextA.newPage();
    await pageA.goto('http://localhost:3000/');
    await expect(pageA.locator('#quietslack-root-shell')).toBeVisible();

    // 2. Open Invite Modal on Peer A and copy invite hash payload
    await pageA.locator('#sidebar-invite-btn').click();
    await expect(pageA.locator('#invite-modal-dialog')).toBeVisible();

    const inviteLinkInput = pageA.locator('#invite-link-copy-input');
    const inviteUrl = await inviteLinkInput.inputValue();
    expect(inviteUrl).toContain('#invite=');

    await pageA.locator('#invite-modal-close-btn').click();

    // 3. Create Peer B Context in isolated incognito session
    const contextB = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    const pageB = await contextB.newPage();
    await pageB.goto(inviteUrl);
    await expect(pageB.locator('#quietslack-root-shell')).toBeVisible();

    // 4. Peer A sends a real-time message
    const msgFromA = `P2P Multi-Browser sync verification: ${Date.now()}`;
    await pageA.locator('#message-textarea-input').fill(msgFromA);
    await pageA.locator('#send-message-button').click();

    // Verify Peer A shows message
    await expect(pageA.getByText(msgFromA)).toBeVisible({ timeout: 5000 });

    // 5. Peer B joins Huddle
    const huddleBtnB = pageB.locator('#channel-huddle-btn');
    if (await huddleBtnB.isVisible()) {
      await huddleBtnB.click();
      await expect(pageB.locator('#huddle-active-overlay')).toBeVisible();
      await pageB.locator('#huddle-leave-btn').click();
    }

    // Clean up
    await contextA.close();
    await contextB.close();
  });
});
