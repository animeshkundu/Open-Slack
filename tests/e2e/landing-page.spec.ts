import { expect, test } from '@playwright/test';

test.describe('Landing Page & Responsiveness Suite', () => {
  test('landing page is scrollable and displays all core marketing & architecture sections', async ({ page }) => {
    await page.goto('./');
    
    // Switch to landing page if in app view
    const landingBtn = page.locator('#ws-menu-landing-page-btn');
    const wsMenuBtn = page.locator('#workspace-header-menu-btn');
    if (await wsMenuBtn.isVisible()) {
      await wsMenuBtn.click();
      await landingBtn.click();
    }

    const landingContainer = page.locator('#open-slack-landing-page');
    await expect(landingContainer).toBeVisible();

    // Verify Hero Section
    await expect(page.locator('#hero-launch-app-btn')).toBeVisible();
    await expect(page.locator('#hero-create-ws-btn')).toBeVisible();
    await expect(page.locator('#hero-join-ws-btn')).toBeVisible();

    // Verify Interactive Showcase section exists
    await expect(page.getByText('True Slack Parity — Zero Compromise')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Channels & Threads' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Audio/Video Huddles' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Theming Engine' })).toBeVisible();

    // Verify Privacy Architecture Deep Dive section
    await expect(page.getByText('Decentralized Privacy Architecture')).toBeVisible();
    await expect(page.getByText('End-to-End Encryption')).toBeVisible();
    await expect(page.getByText('Zero Server Persistence')).toBeVisible();

    // Launch app from landing page
    await page.locator('#hero-launch-app-btn').click();
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
  });

  test('responsive layout adapts smoothly to Mobile (375px), Tablet (768px), and Desktop (1440px)', async ({ page }) => {
    // Desktop Viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
    await expect(page.locator('#workspace-activity-rail')).toBeVisible();
    await expect(page.locator('#primary-sidebar-container')).toBeVisible();

    // Tablet Viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('#openslack-root-shell')).toBeVisible();

    // Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
    await expect(page.locator('#mobile-bottom-navbar')).toBeVisible();
  });
});
