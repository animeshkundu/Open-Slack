import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Pixel-Perfect Visual Screenshots Suite', () => {
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
    await page.goto('./');
    
    // Switch to landing page if in app view
    const wsMenuBtn = page.locator('#workspace-header-menu-btn');
    if (await wsMenuBtn.isVisible()) {
      await wsMenuBtn.click();
      await page.locator('#ws-menu-landing-page-btn').click();
    }
    await expect(page.locator('#open-slack-landing-page')).toBeVisible();
    await page.screenshot({ path: 'screenshots/01-landing-page-desktop.png', fullPage: true });

    // 2. Landing Page Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'screenshots/02-landing-page-mobile.png', fullPage: true });
  });

  test('captures the responsive workspace shell in desktop, tablet, and mobile modes', async ({ page }) => {
    for (const viewport of responsiveViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('./');
      await expect(page.locator('#openslack-root-shell')).toBeVisible();
      await page.screenshot({
        path: `screenshots/responsive-${viewport.name}-workspace.png`,
        fullPage: false,
      });

      if (viewport.name === 'mobile') {
        await page.locator('#mobile-nav-home-btn').click();
        await expect(page.locator('#primary-sidebar-container')).toBeVisible();
        await page.screenshot({ path: 'screenshots/responsive-mobile-sidebar.png' });
        await page.locator('#mobile-nav-channels-btn').click();
        await expect(page.locator('#message-stream-container')).toBeVisible();
      }
    }
  });

  test('captures main workspace, composer, and all dialogs/modals', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await expect(page.locator('#openslack-root-shell')).toBeVisible();

    // 3. Main Chat View
    await page.screenshot({ path: 'screenshots/03-main-chat-view.png' });

    // 4. Search Modal (Cmd+K)
    await page.locator('#header-search-bar-trigger').click();
    await expect(page.locator('#search-modal-card')).toBeVisible();
    await page.screenshot({ path: 'screenshots/04-search-modal.png' });
    await page.locator('#search-modal-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#search-modal-card')).not.toBeVisible();

    // 5. User Settings & Theming Modal
    await page.locator('#workspace-user-profile-btn').click();
    await expect(page.locator('#user-settings-modal-card')).toBeVisible();
    await page.screenshot({ path: 'screenshots/05-user-settings-modal.png' });
    
    // Switch to Themes tab in user settings
    const themeTab = page.locator('#tab-themes-btn');
    if (await themeTab.isVisible()) {
      await themeTab.click();
      await page.screenshot({ path: 'screenshots/06-user-settings-theme-tab.png' });
    }
    await page.locator('#close-settings-modal').click();
    await expect(page.locator('#user-settings-modal-card')).not.toBeVisible();

    // 6. Workspace Settings Modal
    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-ws-settings-btn').click();
    await expect(page.locator('#workspace-settings-modal-card')).toBeVisible();
    await page.screenshot({ path: 'screenshots/07-workspace-settings-modal.png' });
    await page.locator('#close-ws-settings-modal').click();
    await expect(page.locator('#workspace-settings-modal-card')).not.toBeVisible();

    // 7. Invite Modal
    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-invite-btn').click();
    await expect(page.locator('#invite-modal-card')).toBeVisible();
    await page.screenshot({ path: 'screenshots/08-invite-modal.png' });
    await page.locator('#close-invite-modal-btn').click();
    await expect(page.locator('#invite-modal-card')).not.toBeVisible();

    // 8. Create Channel Modal
    await page.locator('#add-channel-plus-btn').click();
    await expect(page.locator('#create-channel-modal-card')).toBeVisible();
    await page.screenshot({ path: 'screenshots/09-create-channel-modal.png' });
    await page.locator('#close-create-channel-modal').click();
    await expect(page.locator('#create-channel-modal-card')).not.toBeVisible();

    // 9. Direct Message Modal
    await page.locator('#add-dm-plus-btn').click();
    await expect(page.locator('#dm-modal-card')).toBeVisible();
    await page.screenshot({ path: 'screenshots/10-direct-message-modal.png' });
    await page.locator('#close-dm-modal').click();
    await expect(page.locator('#dm-modal-card')).not.toBeVisible();

    // 10. Pending Approvals Modal
    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-pending-approvals-btn').click();
    await expect(page.locator('#pending-approvals-modal-card')).toBeVisible();
    await page.screenshot({ path: 'screenshots/11-pending-approvals-modal.png' });
    await page.locator('#close-pending-approvals-modal').click();
    await expect(page.locator('#pending-approvals-modal-card')).not.toBeVisible();

    // 11. Activity & Mentions Feed Drawer
    await page.locator('#header-activity-btn').click();
    await expect(page.locator('#right-drawer-panel')).toBeVisible();
    await page.screenshot({ path: 'screenshots/12-activity-drawer.png' });
    await page.locator('#close-activity-drawer-btn').click();
    await expect(page.locator('#right-drawer-panel')).not.toBeVisible();

    // 12. Active Huddle Dock
    await page.locator('#channel-huddle-btn').click();
    const dock = page.locator('#huddle-floating-dock');
    await expect(dock).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'screenshots/13-active-huddle-dock.png' });
    await page.locator('#huddle-leave-btn').click();
  });
});
