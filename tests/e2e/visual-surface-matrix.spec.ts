import { expect, test, type Page } from '@playwright/test';
import { openWorkspace } from './helpers';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

async function capture(page: Page, name: string, fullPage = false) {
  await page.screenshot({ path: `screenshots/visual-${name}.png`, fullPage });
}

async function openChat(page: Page, viewport: (typeof viewports)[number]) {
  if (viewport.name === 'mobile') {
    await page.locator('#mobile-nav-channels-btn').click();
  }
  await expect(page.locator('#message-stream-container')).toBeVisible();
}

async function openSidebar(page: Page, viewport: (typeof viewports)[number]) {
  if (viewport.name === 'mobile') {
    await page.locator('#mobile-nav-home-btn').click();
  }
  await expect(page.locator('#primary-sidebar-container')).toBeVisible();
}

async function openHeaderMenuItem(
  page: Page,
  viewport: (typeof viewports)[number],
  itemId: string,
  menuItemId: string
) {
  if (viewport.name === 'mobile') {
    await page.locator('#header-more-actions-btn').click();
    await expect(page.locator('#header-more-actions-dropdown')).toBeVisible();
    await page.locator(`#${menuItemId}`).click();
    return;
  }
  await page.locator(`#${itemId}`).click();
}

test.describe('Complete visual surface matrix', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  for (const viewport of viewports) {
    test(`captures every responsive surface on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openWorkspace(page);
      await openChat(page, viewport);

      // Channel header menus and contextual drawers.
      await page.locator('#channel-huddle-dropdown-trigger').click();
      await expect(page.locator('#huddle-dropdown-menu')).toBeVisible();
      await capture(page, `${viewport.name}-huddle-menu`);
      await page.locator('#channel-huddle-dropdown-trigger').click();

      await page.locator('#header-more-actions-btn').click();
      await expect(page.locator('#header-more-actions-dropdown')).toBeVisible();
      await capture(page, `${viewport.name}-header-more-actions`);
      await page.locator('#header-more-actions-btn').click();

      const searchTrigger = page.locator('#header-search-bar-trigger:visible, #mobile-header-search-btn:visible').first();
      await searchTrigger.click();
      await expect(page.locator('#search-modal-card')).toBeVisible();
      await capture(page, `${viewport.name}-search-modal`);
      await page.locator('#search-modal-backdrop').click({ position: { x: 5, y: 5 } });

      await openHeaderMenuItem(page, viewport, 'channel-details-btn', 'more-menu-details-btn');
      await expect(page.locator('#right-drawer-panel')).toBeVisible();
      await capture(page, `${viewport.name}-channel-details-drawer`);
      await page.locator('#close-channel-details-btn').click();

      await openHeaderMenuItem(page, viewport, 'channel-pinned-btn', 'more-menu-pinned-btn');
      await expect(page.locator('#right-drawer-panel')).toBeVisible();
      await capture(page, `${viewport.name}-pinned-drawer`);
      await page.locator('#close-pinned-btn').click();

      await openSidebar(page, viewport);
      await page.locator('#quick-threads-btn').click();
      await expect(page.locator('#right-drawer-panel')).toBeVisible();
      await capture(page, `${viewport.name}-threads-drawer`);
      await page.locator('#close-all-threads-btn').click();

      await openSidebar(page, viewport);
      await page.locator('#quick-activity-btn').click();
      await expect(page.locator('#right-drawer-panel:visible, #mobile-activity-screen:visible').first()).toBeVisible();
      await capture(page, `${viewport.name}-activity-surface`);
      if (await page.locator('#close-activity-drawer-btn').isVisible().catch(() => false)) {
        await page.locator('#close-activity-drawer-btn').click();
      } else {
        await page.locator('#mobile-nav-channels-btn').click();
      }

      // Workspace navigation and all dialog families.
      await openSidebar(page, viewport);
      await page.locator('#workspace-header-menu-btn').click();
      await expect(page.locator('#workspace-header-dropdown')).toBeVisible();
      await capture(page, `${viewport.name}-workspace-menu`);

      await page.locator('#ws-menu-invite-btn').click();
      await expect(page.locator('#invite-modal-card')).toBeVisible();
      await capture(page, `${viewport.name}-invite-link`);
      for (const tab of ['social', 'qr', 'preview-card', 'specs'] as const) {
        await page.locator(`#invite-tab-${tab}-btn`).click();
        await expect(page.locator('#invite-modal-card')).toBeVisible();
        await capture(page, `${viewport.name}-invite-${tab}`);
      }
      await page.locator('#close-invite-modal-btn').click();

      await page.locator('#workspace-header-menu-btn').click();
      await page.locator('#ws-menu-ws-settings-btn').click();
      await expect(page.locator('#workspace-settings-modal-card')).toBeVisible();
      await capture(page, `${viewport.name}-workspace-settings`);
      await page.locator('#leave-workspace-btn').click();
      await capture(page, `${viewport.name}-workspace-settings-leave-confirm`);
      await page.locator('#workspace-settings-modal-card').getByRole('button', { name: 'Cancel', exact: true }).first().click();
      await page.locator('#close-ws-settings-modal').click();

      await page.locator('#workspace-header-menu-btn').click();
      await page.locator('#ws-menu-pending-approvals-btn').click();
      await expect(page.locator('#pending-approvals-modal-card')).toBeVisible();
      await capture(page, `${viewport.name}-pending-approvals`);
      await page.locator('#close-pending-approvals-modal').click();

      await page.locator('#add-channels-inline-btn').click();
      await expect(page.locator('#create-channel-modal-card')).toBeVisible();
      await capture(page, `${viewport.name}-create-channel`);
      await page.locator('#close-create-channel-modal').click();

      await page.locator('#add-dm-inline-btn').click();
      await expect(page.locator('#dm-modal-card')).toBeVisible();
      await capture(page, `${viewport.name}-direct-message`);
      await page.locator('#close-dm-modal').click();

      if (viewport.name === 'mobile') {
        await page.locator('#mobile-nav-you-btn').click();
      } else {
        await page.locator('#sidebar-user-profile-btn, #workspace-user-profile-btn').first().click();
      }
      await expect(page.locator('#user-settings-modal-card')).toBeVisible();
      for (const tab of ['profile', 'themes', 'notifications', 'linked-devices', 'privacy', 'crypto', 'network', 'storage'] as const) {
        await page.locator(`#tab-${tab}-btn`).click();
        await capture(page, `${viewport.name}-user-settings-${tab}`);
      }
      await page.locator('#close-settings-modal').click();

      // Composer popovers and the active huddle states.
      await openChat(page, viewport);
      await page.locator('#composer-emoji-btn').click();
      await expect(page.locator('#reaction-picker-popover')).toBeVisible();
      await capture(page, `${viewport.name}-composer-emoji-picker`);
      await page.locator('#composer-emoji-btn').click();

      await page.locator('#message-composer-textarea').fill('@');
      await expect(page.locator('#mention-autocomplete-menu')).toBeVisible();
      await capture(page, `${viewport.name}-mention-autocomplete`);
      await page.locator('#message-composer-textarea').fill('');

      const firstReaction = page.locator('[id^="hover-reaction-btn-"]').first();
      if (await firstReaction.count()) {
        await firstReaction.hover();
        await firstReaction.click();
        await expect(page.locator('#reaction-picker-popover')).toBeVisible();
        await capture(page, `${viewport.name}-message-reaction-picker`);
        await page.keyboard.press('Escape');
      }

      await page.locator('#channel-huddle-btn').click();
      await expect(page.locator('#huddle-floating-dock')).toBeVisible({ timeout: 15_000 });
      await capture(page, `${viewport.name}-huddle-floating-dock`);
      await page.locator('#huddle-expand-btn').click();
      await expect(page.locator('#huddle-expanded-modal')).toBeVisible();
      await capture(page, `${viewport.name}-huddle-expanded`);
      await page.locator('#huddle-leave-btn-exp').click();
      await expect(page.locator('#huddle-expanded-modal')).not.toBeVisible();
    });
  }
});
