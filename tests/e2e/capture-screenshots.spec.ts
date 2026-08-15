import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import { ensureOnboardingCompleted, openWorkspace } from './helpers';

test.describe('Pixel-Perfect Visual Screenshots Suite Across 3 Device Types', () => {
  const responsiveViewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 768 },
    { name: 'mobile', width: 390, height: 844 },
  ] as const;

  test.beforeAll(() => {
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots', { recursive: true });
    }
  });

  test('captures full landing page across desktop and mobile', async ({ page }) => {
    // 1. Landing Page Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkspace(page);
    
    // Switch to landing page if in app view
    const wsMenuBtn = page.locator('#workspace-header-menu-btn');
    if (await wsMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wsMenuBtn.click();
      await page.locator('#ws-menu-landing-page-btn').click();
    }
    await expect(page.locator('#open-slack-landing-page')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/01-landing-page-desktop.png', fullPage: true });

    // 2. Landing Page Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'screenshots/02-landing-page-mobile.png', fullPage: true });
  });

  test('captures the responsive workspace shell in desktop, tablet, and mobile modes', async ({ page }) => {
    for (const viewport of responsiveViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openWorkspace(page);
      await page.screenshot({
        path: `screenshots/responsive-${viewport.name}-workspace.png`,
        fullPage: false,
      });

      if (viewport.name === 'mobile') {
        await page.locator('#mobile-nav-home-btn').click();
        await expect(page.locator('#primary-sidebar-container')).toBeVisible({ timeout: 5000 });
        await page.screenshot({ path: 'screenshots/responsive-mobile-sidebar.png' });
        await page.locator('#mobile-nav-channels-btn').click();
        await expect(page.locator('#message-stream-container')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('captures threads, drawer panels, and modals across desktop, tablet, and mobile', async ({ page }) => {
    // 1. Desktop 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkspace(page);

    // Main Chat View
    await page.screenshot({ path: 'screenshots/03-main-chat-view-desktop.png' });

    // Threads view on Desktop
    await page.locator('#quick-threads-btn').click();
    await expect(page.locator('#right-drawer-panel')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/04-threads-panel-desktop.png' });
    await page.locator('#close-all-threads-btn').click();

    // Activity Feed on Desktop
    await page.locator('#quick-activity-btn').click();
    await expect(page.locator('#right-drawer-panel')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/05-activity-drawer-desktop.png' });
    await page.locator('#close-activity-drawer-btn').click();

    // Search Modal (Cmd+K)
    const searchTrigger = page.locator('#header-search-bar-trigger:visible, #mobile-header-search-btn:visible').first();
    await searchTrigger.click();
    await expect(page.locator('#search-modal-card')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/06-search-modal.png' });
    await page.locator('#search-modal-backdrop').click({ position: { x: 10, y: 10 } });

    // 2. Tablet 1024px & Resized 850px Split-Desktop Mode
    await page.setViewportSize({ width: 1024, height: 768 });
    await openWorkspace(page);
    await page.screenshot({ path: 'screenshots/07-tablet-main-chat.png' });

    // Open Threads on Tablet: verify slide-over backdrop and non-squished chat
    await page.locator('#quick-threads-btn').click();
    await expect(page.locator('#right-drawer-panel')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/08-tablet-threads-slideover.png' });
    await page.locator('#close-all-threads-btn').click();

    // Resized narrow desktop 850px
    await page.setViewportSize({ width: 850, height: 700 });
    await page.screenshot({ path: 'screenshots/09-resized-narrow-desktop.png' });

    // 3. Mobile 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);

    // Mobile Chat
    await page.screenshot({ path: 'screenshots/10-mobile-chat-view.png' });

    // Mobile Sidebar
    await page.locator('#mobile-nav-home-btn').click();
    await expect(page.locator('#primary-sidebar-container')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/11-mobile-sidebar-view.png' });

    // Mobile Activity tab — bottom nav must remain in frame
    await page.locator('#mobile-nav-activity-btn').click();
    await expect(page.locator('#mobile-activity-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#mobile-nav-bar')).toBeVisible();
    await page.screenshot({ path: 'screenshots/12-mobile-activity-with-bottom-nav.png' });

    // Mobile DMs tab + compose modal
    await page.locator('#mobile-nav-dms-btn').click();
    await expect(page.locator('#primary-sidebar-container')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/13-mobile-dms-sidebar.png' });
    await page.locator('#add-dm-inline-btn').click();
    await expect(page.locator('#dm-modal-card')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/14-mobile-dm-modal.png' });
    await page.locator('#close-dm-modal').click();

    // Invite people (Slack sidebar CTA)
    await page.locator('#sidebar-invite-teammates-btn').click();
    await expect(page.locator('#invite-modal-card')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/15-mobile-invite-people.png' });
    await page.locator('#close-invite-modal-btn').click();

    // Mobile Threads (drawer sits above bottom nav)
    await page.locator('#quick-threads-btn').click();
    await expect(page.locator('#right-drawer-panel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#mobile-nav-bar')).toBeVisible();
    await page.screenshot({ path: 'screenshots/16-mobile-threads-view.png' });
    await page.locator('#close-all-threads-btn').click();
  });
});
