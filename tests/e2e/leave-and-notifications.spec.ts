import { expect, test } from '@playwright/test';
import { openWorkspace } from './helpers';

test.describe('Leave Channels/DMs and Slack Toast Notifications Suite', () => {
  test.beforeEach(async ({ page }) => {
    await openWorkspace(page, 'Test Automator');
  });

  test('creates a private channel and successfully leaves it', async ({ page }) => {
    const channelName = `secret-${Date.now()}`;

    // 1. Open Create Channel Modal
    await page.locator('#add-channels-inline-btn').click();
    await expect(page.locator('#create-channel-modal-card')).toBeVisible();

    // 2. Fill details and toggle Private
    await page.locator('#channel-name-input').fill(channelName);
    await page.locator('#channel-topic-input').fill('Confidential workspace discussions');
    // Toggle is a visually hidden checkbox - click the peer track div / label
    await page.locator('label:has(#channel-private-toggle)').click();
    await page.locator('#submit-create-channel-btn').click();

    // 3. Verify channel created and active
    await expect(page.locator('#create-channel-modal-card')).not.toBeVisible();
    await expect(page.locator(`#sidebar-channel-${channelName}`)).toBeVisible();
    await expect(page.locator('#main-channel-header')).toContainText(channelName);

    // 4. Hover or trigger Leave button on the channel
    const leaveBtn = page.locator(`#leave-channel-btn-${channelName}`);
    await expect(leaveBtn).toBeAttached();
    await leaveBtn.click({ force: true });

    // 5. Confirm channel is removed from list and app switched back to #general
    await expect(page.locator(`#sidebar-channel-${channelName}`)).not.toBeVisible();
    await expect(page.locator('#main-channel-header')).toContainText('general');
  });

  test('starts a direct message and successfully leaves / closes it', async ({ page }) => {
    // 1. Open DM Modal
    await page.locator('#add-dm-inline-btn').click();
    await expect(page.locator('#dm-modal-card')).toBeVisible();

    // 2. Select peer or start via manual pubkey (solo browser has no peers)
    const firstPeer = page.locator('[id^="dm-user-"]').first();
    if (await firstPeer.isVisible()) {
      await firstPeer.click();
      await page.locator('#start-dm-btn').click();
    } else {
      await page.locator('#dm-modal-card input[placeholder*="public key"]').fill(
        'b1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'
      );
      await page.locator('#dm-modal-card button:has-text("Start DM")').click();
    }

    await expect(page.locator('#dm-modal-card')).not.toBeVisible();
    await expect(page.locator('#main-channel-header')).toBeVisible();
    await expect(page.locator('[id^="sidebar-dm-"]').first()).toBeVisible();

    // 3. Close / leave the DM and fall back to general
    const dmLeaveBtn = page.locator('[id^="leave-dm-btn-"]').first();
    await dmLeaveBtn.click({ force: true });
    await expect(page.locator('#main-channel-header')).toContainText('general');
  });

  test('starting multiple DMs keeps every conversation in the sidebar', async ({ page }) => {
    const peers = [
      'aa111111111111111111111111111111',
      'bb222222222222222222222222222222',
      'cc333333333333333333333333333333',
    ];

    for (const peer of peers) {
      await page.locator('#add-dm-inline-btn').click();
      await expect(page.locator('#dm-modal-card')).toBeVisible();
      await page.locator('#dm-modal-card input[placeholder*="public key"]').fill(peer);
      await page.locator('#dm-modal-card button:has-text("Start DM")').click();
      await expect(page.locator('#dm-modal-card')).not.toBeVisible();
      await expect(page.locator('#main-channel-header')).toBeVisible();
    }

    // All three DMs remain listed - starting a new one must not replace prior chats
    await expect(page.locator('[id^="sidebar-dm-"]')).toHaveCount(3);
  });

  test('verifies direct message and channel info pane with leave action', async ({ page }) => {
    // 1. Open DM Modal and start a conversation via pubkey
    await page.locator('#add-dm-inline-btn').click();
    await expect(page.locator('#dm-modal-card')).toBeVisible();
    await page.locator('#dm-modal-card input[placeholder*="public key"]').fill(
      'ee444444444444444444444444444444'
    );
    await page.locator('#dm-modal-card button:has-text("Start DM")').click();
    await expect(page.locator('#dm-modal-card')).not.toBeVisible();
    await expect(page.locator('#main-channel-header')).toBeVisible();

    // Open Channel/DM Details in Right Drawer
    await page.locator('#channel-details-btn').click();
    await expect(page.locator('#right-drawer-panel')).toBeVisible();
    await expect(page.getByText(/Members \(\d+\)/)).toBeVisible();

    // Leave conversation via drawer
    await page.locator('#leave-conversation-drawer-btn').click();
    await expect(page.locator('#main-channel-header')).toContainText('general');
  });
});
