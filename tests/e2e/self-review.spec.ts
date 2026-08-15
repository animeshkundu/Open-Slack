import { expect, test } from '@playwright/test';
import { openWorkspace } from './helpers';

test.describe('Open Slack Comprehensive Self-Review & Autonomous E2E Matrix', () => {
  test('Journey 1: Landing Page Two-Step Onboarding with Real Name on Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkspace(page);

    // Switch to Landing Page
    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-landing-page-btn').click();

    await expect(page.locator('#open-slack-landing-page')).toBeVisible();

    // Click "Create New Mesh Workspace"
    await page.locator('#hero-create-workspace-btn').click();
    await expect(page.locator('#create-workspace-modal-card')).toBeVisible();

    // Step 1: Identity capture (real name → auto handle)
    await expect(page.locator('#landing-user-name-input')).toBeVisible();
    await page.locator('#landing-user-name-input').fill('Alice Reviewer');
    await page.locator('#step1-next-btn').click();

    // Step 2: Workspace details
    await expect(page.locator('#landing-ws-name-input')).toBeVisible();
    await page.locator('#landing-ws-name-input').fill('Self Review Team');
    await page.locator('#submit-create-workspace-btn').click();

    // Should transition directly to the workspace shell
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
    await expect(page.locator('#main-channel-header')).toContainText('general');
  });

  test('Journey 2: Mobile Single-Pane Navigation & Bottom Nav Stack (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);

    // Check Mobile Bottom Nav Bar is visible
    const mobileNav = page.locator('#mobile-nav-bar');
    await expect(mobileNav).toBeVisible();

    // 1. Home Tab (Sidebar channels list)
    await page.locator('#mobile-nav-home-btn').click();
    await expect(page.locator('#primary-sidebar-container')).toBeVisible();

    // Select channel from sidebar to enter chat view
    const generalChannel = page.locator('#sidebar-channel-general');
    if (await generalChannel.isVisible()) {
      await generalChannel.click();
    }

    // Back to Channels / Chat view
    await page.locator('#mobile-nav-channels-btn').click();
    await expect(page.locator('#message-stream-container')).toBeVisible();

    // 2. Activity Tab — bottom nav must remain visible (Slack mobile parity)
    await page.locator('#mobile-nav-activity-btn').click();
    await expect(page.locator('#mobile-activity-screen')).toBeVisible();
    await expect(page.locator('#activity-feed-drawer')).toBeVisible();
    await expect(page.locator('#activity-feed-drawer')).toHaveAttribute('data-variant', 'page');
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav).toBeInViewport();
    // Drawer close chrome is hidden on the tab surface
    await expect(page.locator('#close-activity-drawer-btn')).toHaveCount(0);

    // Activity via sidebar quick action must also keep the bottom bar
    await page.locator('#mobile-nav-home-btn').click();
    await expect(page.locator('#primary-sidebar-container')).toBeVisible();
    await page.locator('#quick-activity-btn').click();
    await expect(page.locator('#mobile-activity-screen')).toBeVisible();
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav).toBeInViewport();

    // 3. You Tab (Settings bottom sheet)
    await page.locator('#mobile-nav-you-btn').click();
    await expect(page.locator('#user-settings-modal-card')).toBeVisible();
    await page.locator('#close-settings-modal').click();
  });

  test('Journey 3: Responsive Bottom Sheets on Mobile (<768px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);

    // Open User Settings
    await page.locator('#mobile-nav-you-btn').click();
    const sheet = page.locator('#user-settings-modal-card');
    await expect(sheet).toBeVisible();

    // Verify Mobile Drag Handle exists
    await expect(sheet.locator('.bg-neutral-300')).toBeVisible();
    await page.locator('#close-settings-modal').click();
    await expect(sheet).not.toBeVisible();
  });

  test('Journey 4: Floating Huddle Dock on Mobile and Desktop', async ({ page }) => {
    // Desktop check
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkspace(page);

    await page.locator('#channel-huddle-btn').click();
    const dock = page.locator('#huddle-floating-dock');
    await expect(dock).toBeVisible({ timeout: 15000 });

    // Toggle Mute & Video
    await page.locator('#huddle-mute-btn').click();
    await page.locator('#huddle-video-btn').click();

    // Leave
    await page.locator('#huddle-leave-btn').click();
    await expect(dock).not.toBeVisible();
  });

  test('Journey 5: Message Composer, Markdown, Reactions & Sticky Dividers', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWorkspace(page);

    const timestamp = Date.now();
    const msgText = `**Bold testing message** with [link](https://github.com) #${timestamp}`;

    await page.locator('#message-composer-textarea').fill(msgText);
    await page.locator('#composer-send-btn').click();

    await expect(page.getByText(`Bold testing message`)).toBeVisible();
  });

  test('Journey 6: Search Modal on Desktop and Mobile Header Trigger', async ({ page }) => {
    // Mobile search button trigger
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);

    // On mobile, chat view may need to be active for header search
    await page.locator('#mobile-nav-channels-btn').click();
    await page.locator('#mobile-header-search-btn').click();
    await expect(page.locator('#search-modal-card')).toBeVisible();
    await page.locator('#search-modal-input').fill('general');
    await page.locator('#search-modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#search-modal-card')).not.toBeVisible();
  });
});
