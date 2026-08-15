import { expect, test } from '@playwright/test';
import { ensureOnboardingCompleted } from './helpers';

test.describe('Landing Page & Responsiveness Suite', () => {
  test('landing page is scrollable and displays all core marketing & architecture sections', async ({ page }) => {
    await page.goto('./');
    await ensureOnboardingCompleted(page);
    
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
    await expect(page.getByText('Explore Technical Docs')).toBeVisible();

    // Verify Interactive Showcase section exists
    await expect(page.locator('#features')).toBeVisible();
    await expect(page.getByText('Enterprise messaging capabilities without any central servers.')).toBeVisible();
    await expect(page.locator('#interactive-docs')).toBeVisible();
    await expect(page.getByText('WebRTC Mesh & Signaling')).toBeVisible();

    // Verify Privacy Architecture Deep Dive section
    await expect(page.locator('#comparison')).toBeVisible();
    await expect(page.getByText('End-to-End Encryption')).toBeVisible();
    await expect(page.getByText('Zero (100% Client-Side P2P)')).toBeVisible();

    const landingScrollMetrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(landingScrollMetrics.scrollHeight).toBeGreaterThan(landingScrollMetrics.viewportHeight);
    expect(landingScrollMetrics.scrollWidth).toBeLessThanOrEqual(landingScrollMetrics.viewportWidth);

    // Launch app from landing page
    await page.locator('#hero-launch-app-btn').click();
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
  });

  test('responsive layout adapts smoothly to Mobile (375px), Tablet (768px), and Desktop (1440px)', async ({ page }) => {
    // Desktop Viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await ensureOnboardingCompleted(page);
    await expect(page.locator('#workspace-rail-bar')).toBeVisible();
    await expect(page.locator('#primary-sidebar-container')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      )
      .toBe(true);

    // Tablet Viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('#openslack-root-shell')).toBeVisible();

    // Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
    await expect(page.locator('#mobile-bottom-nav-bar')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      )
      .toBe(true);

    await page.locator('#mobile-nav-home-btn').click();
    await expect(page.locator('#primary-sidebar-container')).toBeVisible();
    await page.locator('#mobile-nav-chat-btn').click();
    await page.locator('#channel-details-btn').click();
    await expect(page.locator('#right-drawer-panel')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      )
      .toBe(true);
  });
});
