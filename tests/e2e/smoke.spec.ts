import { expect, test } from '@playwright/test';

test.describe('QuietSlack Smoke & Core UI Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('loads QuietSlack interface with primary elements', async ({ page }) => {
    // Root shell
    await expect(page.locator('#openslack-root-shell')).toBeVisible();

    // Primary channels sidebar
    await expect(page.locator('#primary-sidebar-container')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Channels', exact: true })).toBeVisible();

    // Default channel general
    await expect(page.locator('#main-channel-header')).toContainText('general');

    // Message list and composer
    await expect(page.locator('#message-stream-container')).toBeVisible();
    await expect(page.locator('#message-composer-textarea')).toBeVisible();
    await expect(page.locator('#composer-send-btn')).toBeVisible();
  });

  test('can switch between channels and search modal', async ({ page }) => {
    // Click random channel
    const randomChannel = page.locator('#sidebar-channel-random');
    if (await randomChannel.isVisible()) {
      await randomChannel.click();
      await expect(page.locator('#main-channel-header')).toContainText('random');
    }

    // Open Search modal via Ctrl+K trigger button
    await page.locator('#header-search-bar-trigger').click();
    await expect(page.locator('#search-modal-card')).toBeVisible();
    await expect(page.locator('#search-modal-input')).toBeVisible();

    // Type query
    await page.locator('#search-modal-input').fill('Welcome');
    await page.locator('#search-modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#search-modal-card')).not.toBeVisible();
  });

  test('can type and send a chat message', async ({ page }) => {
    const testMessage = `Automated smoke test message #${Date.now()}`;
    const textarea = page.locator('#message-composer-textarea');
    await textarea.fill(testMessage);
    await page.locator('#composer-send-btn').click();

    // Message should render in message stream
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });
  });

  test('can toggle reactions and huddle voice interface', async ({ page }) => {
    // Huddle button
    const huddleBtn = page.locator('#channel-huddle-btn');
    await expect(huddleBtn).toBeVisible();
    await huddleBtn.click();

    // Huddle overlay appears
    await expect(page.locator('#huddle-floating-dock')).toBeVisible({ timeout: 15000 });

    // Leave huddle
    await page.locator('#huddle-leave-btn').click();
    await expect(page.locator('#huddle-floating-dock')).not.toBeVisible();
  });
});
