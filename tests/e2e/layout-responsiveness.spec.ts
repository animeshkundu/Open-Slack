import { expect, test } from '@playwright/test';
import { ensureOnboardingCompleted } from './helpers';

test.describe('Layout & Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Set a large desktop viewport explicitly to ensure sidebar is not hidden by Tailwind breakpoints
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await ensureOnboardingCompleted(page, 'Test User');
    
    // Brief wait for React state and animations to settle
    await page.waitForTimeout(1000);
    
    // Wait for app to fully settle (PrimarySidebar profile button should be visible)
    const profileBtn = page.locator('#sidebar-user-profile-btn');
    await profileBtn.waitFor({ state: 'visible', timeout: 20000 });
  });

  test('User Settings Modal reflows correctly on mobile and desktop', async ({ page }) => {
    // Open Settings (Desktop)
    await page.click('#sidebar-user-profile-btn');
    
    const modal = page.locator('#user-settings-modal-card');
    await expect(modal).toBeVisible();

    // Check desktop layout (default viewport is usually 1280x720)
    await page.click('#tab-linked-devices-btn');
    
    const qrImage = page.locator('#linked-device-qr-img');
    const instructionText = page.locator('div:has-text("Scan QR Code or Copy Direct Link")').first();

    const qrBox = await qrImage.boundingBox();
    const textBox = await instructionText.boundingBox();

    if (qrBox && textBox) {
      // On desktop (md:flex-row), they should be side-by-side
      const isSideBySide = (qrBox.y < textBox.y + textBox.height) && (textBox.y < qrBox.y + qrBox.height);
      expect(isSideBySide).toBe(true);
    }

    // Check for horizontal overflow on desktop
    const scrollWidthDesktop = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidthDesktop = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidthDesktop).toBeLessThanOrEqual(clientWidthDesktop);

    // Close modal
    await page.click('#close-settings-modal');

    // Switch to Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Re-open modal for tablet view
    await page.click('#sidebar-user-profile-btn');
    await page.click('#tab-linked-devices-btn');
    
    const qrBoxTablet = await page.locator('#linked-device-qr-img').boundingBox();
    const textBoxTablet = await page.locator('#linked-device-instruction-header').boundingBox();
    if (qrBoxTablet && textBoxTablet) {
      // On tablet (md is usually 768px), it might be row or col depending on exact implementation.
      // Tailwind md starts at 768px. So it should be row (side-by-side).
      const isSideBySideTablet = (qrBoxTablet.y < textBoxTablet.y + textBoxTablet.height) && (textBoxTablet.y < qrBoxTablet.y + qrBoxTablet.height);
      expect(isSideBySideTablet).toBe(true);
    }

    // Close modal after tablet check to prepare for mobile check
    await page.click('#close-settings-modal');
    await expect(modal).toBeHidden();

    // Switch to Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // On mobile, the WorkspaceBar is hidden, use MobileNavBar
    // Wait for MobileNavBar to be visible first
    await page.waitForSelector('#mobile-nav-bar', { state: 'visible', timeout: 5000 });
    await page.click('#mobile-nav-you-btn');
    
    await expect(modal).toBeVisible();

    // On mobile, the sidebar (tabs) should be horizontal and content below
    const sidebar = page.locator('div:has(> #tab-profile-btn)');
    const sidebarBox = await sidebar.boundingBox();
    const contentArea = page.locator('#user-settings-modal-card > div:last-child > div:last-child');
    const contentBox = await contentArea.boundingBox();

    if (sidebarBox && contentBox) {
      // Sidebar should be above content (or at least not overlapping horizontally in a way that suggests fixed sidebar)
      expect(sidebarBox.y + sidebarBox.height).toBeLessThanOrEqual(contentBox.y + 1);
    }

    // Check QR code stacks on mobile
    await page.click('#tab-linked-devices-btn');
    const qrBoxMobile = await page.locator('#linked-device-qr-img').boundingBox();
    const textBoxMobile = await page.locator('#linked-device-instruction-header').boundingBox();

    if (qrBoxMobile && textBoxMobile) {
      // Should be stacked (non-overlapping Y ranges)
      const isStacked = (qrBoxMobile.y + qrBoxMobile.height) <= textBoxMobile.y + 10; // allow small margin
      expect(isStacked).toBe(true);
    }

    // Check for horizontal overflow on mobile
    const scrollWidthMobile = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidthMobile = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidthMobile).toBeLessThanOrEqual(clientWidthMobile);
  });

  test('Check for overlapping elements in Linked Devices tab', async ({ page }) => {
    await page.click('#sidebar-user-profile-btn');
    await page.click('#tab-linked-devices-btn');

    // Simple overlap check helper
    const checkOverlap = async (sel1: string, sel2: string) => {
      const box1 = await page.locator(sel1).boundingBox();
      const box2 = await page.locator(sel2).boundingBox();
      if (!box1 || !box2) return false;

      return (
        box1.x < box2.x + box2.width &&
        box1.x + box1.width > box2.x &&
        box1.y < box2.y + box2.height &&
        box1.y + box1.height > box2.y
      );
    };

    // QR image should not overlap the copy button or input
    const overlapsButton = await checkOverlap('#linked-device-qr-img', '#copy-linked-device-url-btn');
    expect(overlapsButton).toBe(false);

    const overlapsInput = await checkOverlap('#linked-device-qr-img', '#linked-device-url-input');
    expect(overlapsInput).toBe(false);
  });

  test('Desktop sidebar can be collapsed and expanded', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Correct selector for PrimarySidebar parent in AppLayout
    const appSidebar = page.locator('#primary-sidebar-container');
    
    await expect(appSidebar).toBeVisible();
    
    // Click toggle button in MainHeader
    await page.click('#desktop-toggle-sidebar-btn');
    
    // Sidebar should now be hidden (isSidebarCollapsed -> 'hidden')
    await expect(appSidebar).toBeHidden();
    
    // Click toggle again
    await page.click('#desktop-toggle-sidebar-btn');
    await expect(appSidebar).toBeVisible();
  });
});
