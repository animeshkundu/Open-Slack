import { expect, test } from '@playwright/test';
import { ensureOnboardingCompleted } from './helpers';

test.describe('Secondary workspace flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await ensureOnboardingCompleted(page);
  });

  test('creates a channel and makes it the active conversation', async ({ page }) => {
    const channelName = `browser-${Date.now()}`;

    await page.locator('#add-channels-inline-btn').click();
    await expect(page.locator('#create-channel-modal-card')).toBeVisible();
    await page.locator('#channel-name-input').fill(channelName);
    await page.locator('#channel-topic-input').fill('Browser flow verification');
    await page.locator('#submit-create-channel-btn').click();

    await expect(page.locator('#create-channel-modal-card')).not.toBeVisible();
    await expect(page.locator(`#sidebar-channel-${channelName}`)).toBeVisible();
    await expect(page.locator('#main-channel-header')).toContainText(channelName);
  });

  test('opens and closes invite, workspace settings, and user preferences', async ({ page }) => {
    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-invite-btn').click();
    await expect(page.locator('#invite-modal-card')).toBeVisible();
    await expect(page.locator('#invite-link-input')).toHaveValue(/#invite=.+$/);
    await page.locator('#close-invite-modal-btn').click();

    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-ws-settings-btn').click();
    await expect(page.locator('#workspace-settings-modal-card')).toBeVisible();
    await page.locator('#close-ws-settings-modal').click();

    await page.locator('#workspace-user-profile-btn').click();
    await expect(page.locator('#user-settings-modal-card')).toBeVisible();
    await page.locator('#tab-themes-btn').click();
    await expect(page.getByText('Pre-Configured Slack Themes')).toBeVisible();
    await page.getByRole('button', { name: 'Nocturne (Dark Graphite)' }).click();
    await page.locator('#close-settings-modal').click();
    await expect(page.locator('#user-settings-modal-card')).not.toBeVisible();
  });

  test('opens activity and returns from the landing page', async ({ page }) => {
    await page.locator('#quick-activity-btn').click();
    await expect(page.locator('#activity-feed-drawer')).toBeVisible();
    await page.locator('#close-activity-drawer-btn').click();
    await expect(page.locator('#activity-feed-drawer')).not.toBeVisible();

    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-landing-page-btn').click();
    await expect(page.locator('#open-slack-landing-page')).toBeVisible();
    await page.locator('#hero-create-workspace-btn').click();
    await expect(page.getByTestId('onboarding-modal-card')).toBeVisible();
    await page.locator('#close-onboarding-modal').click();
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
  });
});
