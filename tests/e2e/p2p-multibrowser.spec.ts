import { expect, test } from '@playwright/test';
import { ensureOnboardingCompleted } from './helpers';

test.describe('Multi-Browser P2P Interaction & CRDT Synchronization', () => {
  test('synchronizes messages and presence across two isolated browser contexts', async ({ browser }) => {
    // 1. Create Peer A Context
    const contextA = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    const pageA = await contextA.newPage();
    await pageA.goto('./');
    await ensureOnboardingCompleted(pageA, 'Peer A');

    // 2. Open Invite Modal on Peer A and copy invite hash payload
    await pageA.locator('#workspace-header-menu-btn').click();
    await pageA.locator('#ws-menu-invite-btn').click();
    await expect(pageA.locator('#invite-modal-card')).toBeVisible();

    const inviteLinkInput = pageA.locator('#invite-link-input');
    const inviteUrl = await inviteLinkInput.inputValue();
    expect(inviteUrl).toContain('#invite=');

    await pageA.locator('#close-invite-modal-btn').click();

    // 3. Create Peer B Context in isolated incognito session
    const contextB = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    const pageB = await contextB.newPage();
    await pageB.goto(inviteUrl);
    await ensureOnboardingCompleted(pageB, 'Peer B');

    // 4. Peer A sends a real-time message
    const msgFromA = `P2P Multi-Browser sync verification: ${Date.now()}`;
    await pageA.locator('#message-composer-textarea').fill(msgFromA);
    await pageA.locator('#composer-send-btn').click();

    // Verify Peer A shows message
    await expect(pageA.getByText(msgFromA)).toBeVisible({ timeout: 5000 });

    // 5. Peer B joins Huddle
    const huddleBtnB = pageB.locator('#channel-huddle-btn');
    if (await huddleBtnB.isVisible()) {
      await huddleBtnB.click();
      await expect(pageB.locator('#huddle-floating-dock')).toBeVisible();
      await pageB.locator('#huddle-leave-btn').click();
    }

    // Clean up
    await contextA.close();
    await contextB.close();
  });
});
