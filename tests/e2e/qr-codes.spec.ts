import { expect, test } from '@playwright/test';
import { ensureOnboardingCompleted } from './helpers';

test.describe('QR Code Generation End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[Browser Error] ${err.message}`));
    await page.goto('./');
    await ensureOnboardingCompleted(page);
  });

  test('tests workspace invite QR code generation end-to-end', async ({ page }) => {
    // 1. Open workspace menu and click Invite
    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-invite-btn').click();
    await expect(page.locator('#invite-modal-card')).toBeVisible();

    // 2. Click QR Code tab
    await page.locator('#invite-tab-qr-btn').click();
    await expect(page.locator('#invite-qr-container')).toBeVisible();

    // 3. Verify QR code image is successfully generated and rendered (data URL src)
    const qrImage = page.locator('#invite-qr-image');
    await expect(qrImage).toBeVisible({ timeout: 10000 });
    const src = await qrImage.getAttribute('src');
    expect(src).toContain('data:image/png;base64,');

    // 4. Close invite modal
    await page.locator('#close-invite-modal-btn').click();
    await expect(page.locator('#invite-modal-card')).not.toBeVisible();
  });

  test('tests linked devices / device sync QR code generation end-to-end', async ({ page }) => {
    // 1. Open user profile settings
    await page.locator('#workspace-user-profile-btn').click();
    await expect(page.locator('#user-settings-modal-card')).toBeVisible();

    // 2. Click Linked Devices tab
    const linkedDevicesBtn = page.locator('#tab-linked-devices-btn');
    await linkedDevicesBtn.scrollIntoViewIfNeeded();
    await linkedDevicesBtn.click({ force: true });
    await expect(page.locator('#linked-device-qr-img')).toBeVisible({ timeout: 10000 });

    // 3. Verify linked device QR image is successfully generated and rendered (data URL src)
    const deviceQrImg = page.locator('#linked-device-qr-img');
    const src = await deviceQrImg.getAttribute('src');
    expect(src).toContain('data:image/png;base64,');

    // 4. Verify sync URL input has a valid device-sync URL
    const urlInput = page.locator('#linked-device-url-input');
    await expect(urlInput).toBeVisible();
    const syncUrl = await urlInput.inputValue();
    expect(syncUrl).toContain('#device-sync=');

    // 5. Close user settings modal
    await page.locator('#close-settings-modal').click();
    await expect(page.locator('#user-settings-modal-card')).not.toBeVisible();
  });
});
