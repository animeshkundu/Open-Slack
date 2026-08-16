import { expect, Page } from '@playwright/test';
import { injectNostrRelayMocks } from './mockRelays';

export { injectNostrRelayMocks } from './mockRelays';

/**
 * Complete first-time onboarding if present and wait until the workspace shell
 * is interactable (overlay fully dismissed).
 *
 * Identity hydrates asynchronously from IndexedDB, so the onboarding overlay
 * can appear *after* the shell is already visible. We poll until identity has
 * settled instead of doing a single early check.
 */
export async function ensureOnboardingCompleted(
  page: Page,
  displayName = 'Alice Reviewer'
): Promise<void> {
  await injectNostrRelayMocks(page);
  const landingPage = page.locator('#open-slack-landing-page');
  const overlay = page.locator('#first-time-onboarding-overlay');
  const nameInput = page.locator('#first-time-name-input');
  const landingNameInput = page.locator('#landing-user-name-input');
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    // 1. Check for Onboarding Modal FIRST (identity exists but needs name/workspace)
    // We check this first because the shell can load in the background behind the overlay.
    const isOverlayVisible = await overlay.isVisible().catch(() => false);
    if (isOverlayVisible) {
      const isNameInputVisible = await nameInput.isVisible().catch(() => false);
      if (isNameInputVisible) {
        await nameInput.fill('');
        await nameInput.fill(displayName);
        await page.locator('#first-time-submit-btn').click();
        await expect(overlay).toBeHidden({ timeout: 10000 });
        continue; // check again to verify stability
      }
    }

    // 2. Check for Landing Page (initial visitor with no workspaces)
    const isLandingVisible = await landingPage.isVisible().catch(() => false);
    if (isLandingVisible) {
      const isLandingNameVisible = await landingNameInput.isVisible().catch(() => false);
      if (isLandingNameVisible) {
        await landingNameInput.fill('');
        await landingNameInput.fill(displayName);
        await page.locator('#hero-create-workspace-btn').click();
        
        // Wait for landing page to either hide or show onboarding modal
        await page.waitForTimeout(1000);
        continue;
      }
    }

    // 3. Check if shell is ready and stable (only when onboarding overlay is not visible)
    const shellReady = await page.locator('#openslack-root-shell').isVisible().catch(() => false);
    if (shellReady && !isOverlayVisible) {
      // Ensure identity has hydrated (at least one of the major shell indicators is visible)
      const visibleIndicator = page.locator('#sidebar-user-profile-btn:visible, #workspace-user-profile-btn:visible, #mobile-nav-bar:visible');
      if (await visibleIndicator.count() > 0) {
        break;
      }
    }

    await page.waitForTimeout(500);
  }

  // Double-verify overlay is hidden
  const isOverlayStillVisible = await overlay.isVisible().catch(() => false);
  if (isOverlayStillVisible) {
    const isNameInputVisible = await nameInput.isVisible().catch(() => false);
    if (isNameInputVisible) {
      await nameInput.fill('');
      await nameInput.fill(displayName);
      await page.locator('#first-time-submit-btn').click();
      await expect(overlay).toBeHidden({ timeout: 10000 });
    }
  }

  await expect(page.locator('#openslack-root-shell')).toBeVisible({ timeout: 15000 });
}

/** Navigate to app root and finish onboarding. */
export async function openWorkspace(page: Page, displayName = 'Alice Reviewer'): Promise<void> {
  await injectNostrRelayMocks(page);
  await page.goto('./');
  await ensureOnboardingCompleted(page, displayName);
}
