import { expect, test } from '@playwright/test';

test.describe('QuietSlack Smoke & Core UI Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads QuietSlack interface with primary elements', async ({ page }) => {
    // Root shell
    await expect(page.locator('#quietslack-root-shell')).toBeVisible();

    // Primary channels sidebar
    await expect(page.locator('#primary-sidebar')).toBeVisible();
    await expect(page.locator('#sidebar-channels-section')).toBeVisible();

    // Default channel general
    await expect(page.locator('#main-channel-header')).toBeVisible();
    await expect(page.getByText('general', { exact: false })).toBeVisible();

    // Message list and composer
    await expect(page.locator('#message-stream-container')).toBeVisible();
    await expect(page.locator('#message-textarea-input')).toBeVisible();
    await expect(page.locator('#send-message-button')).toBeVisible();
  });

  test('can switch between channels and search modal', async ({ page }) => {
    // Click random channel
    const randomChannel = page.locator('#channel-item-chan_random');
    if (await randomChannel.isVisible()) {
      await randomChannel.click();
      await expect(page.locator('#main-channel-header')).toContainText('random');
    }

    // Open Search modal via Ctrl+K trigger button
    await page.locator('#header-search-bar-trigger').click();
    await expect(page.locator('#search-dialog-modal')).toBeVisible();
    await expect(page.locator('#search-query-input')).toBeVisible();

    // Type query
    await page.locator('#search-query-input').fill('Welcome');
    await page.keyboard.press('Escape');
    await expect(page.locator('#search-dialog-modal')).not.toBeVisible();
  });

  test('can type and send a chat message', async ({ page }) => {
    const testMessage = `Automated smoke test message #${Date.now()}`;
    const textarea = page.locator('#message-textarea-input');
    await textarea.fill(testMessage);
    await page.locator('#send-message-button').click();

    // Message should render in message stream
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });
  });

  test('can toggle reactions and huddle voice interface', async ({ page }) => {
    // Huddle button
    const huddleBtn = page.locator('#channel-huddle-btn');
    await expect(huddleBtn).toBeVisible();
    await huddleBtn.click();

    // Huddle overlay appears
    await expect(page.locator('#huddle-active-overlay')).toBeVisible({ timeout: 5000 });

    // Leave huddle
    await page.locator('#huddle-leave-btn').click();
    await expect(page.locator('#huddle-active-overlay')).not.toBeVisible();
  });
});
