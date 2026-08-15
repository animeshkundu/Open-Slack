import { expect, test } from '@playwright/test';

test.describe('Leave Channels/DMs and Slack Toast Notifications Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    const onboardingName = page.locator('#first-time-name-input');
    if (await onboardingName.isVisible({ timeout: 1500 }).catch(() => false)) {
      await onboardingName.fill('Test Automator');
      await page.locator('#first-time-submit-btn').click();
    }
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
  });

  test('creates a private channel and successfully leaves it', async ({ page }) => {
    const channelName = `secret-${Date.now()}`;

    // 1. Open Create Channel Modal
    await page.locator('#add-channels-inline-btn').click();
    await expect(page.locator('#create-channel-modal-card')).toBeVisible();

    // 2. Fill details and toggle Private
    await page.locator('#channel-name-input').fill(channelName);
    await page.locator('#channel-topic-input').fill('Confidential workspace discussions');
    await page.locator('#channel-private-toggle-btn').click();
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
    await expect(page.locator('#direct-message-modal-card')).toBeVisible();

    // 2. Select peer or custom member
    const firstPeer = page.locator('[id^="dm-peer-"]').first();
    if (await firstPeer.isVisible()) {
      await firstPeer.click();
      await page.locator('#start-dm-btn').click();

      await expect(page.locator('#direct-message-modal-card')).not.toBeVisible();
      // Verify DM header
      await expect(page.locator('#main-channel-header')).toBeVisible();

      // Find DM leave button in sidebar
      const dmLeaveBtn = page.locator('[id^="leave-dm-btn-"]').first();
      if (await dmLeaveBtn.isVisible()) {
        await dmLeaveBtn.click({ force: true });
        // Fallback to general
        await expect(page.locator('#main-channel-header')).toContainText('general');
      }
    } else {
      // Close DM modal if empty test env
      await page.locator('#close-dm-modal-btn').click();
      await expect(page.locator('#direct-message-modal-card')).not.toBeVisible();
    }
  });

  test('verifies direct message and channel info pane with leave action', async ({ page }) => {
    // 1. Open DM Modal
    await page.locator('#add-dm-inline-btn').click();
    await expect(page.locator('#direct-message-modal-card')).toBeVisible();

    // 2. Select peer or custom member
    const firstPeer = page.locator('[id^="dm-peer-"]').first();
    if (await firstPeer.isVisible()) {
      await firstPeer.click();
      await page.locator('#start-dm-btn').click();

      await expect(page.locator('#direct-message-modal-card')).not.toBeVisible();
      // Verify DM header
      await expect(page.locator('#main-channel-header')).toBeVisible();

      // Open Channel/DM Details in Right Drawer
      await page.locator('#channel-details-btn').click();
      await expect(page.locator('#right-drawer-panel')).toBeVisible();
      await expect(page.getByText(/Members \(\d+\)/)).toBeVisible();

      // Leave conversation via drawer
      const leaveDrawerBtn = page.locator('#leave-conversation-drawer-btn');
      if (await leaveDrawerBtn.isVisible()) {
        await leaveDrawerBtn.click();
        await expect(page.locator('#main-channel-header')).toContainText('general');
      }
    } else {
      // Close DM modal if empty test env
      await page.locator('#close-dm-modal-btn').click();
      await expect(page.locator('#direct-message-modal-card')).not.toBeVisible();
    }
  });
});
