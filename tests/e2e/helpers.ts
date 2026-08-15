import { expect, Page } from '@playwright/test';

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
  await page.locator('#openslack-root-shell').waitFor({ state: 'visible', timeout: 20000 });

  const landingPage = page.locator('#open-slack-landing-page');
  const overlay = page.locator('#first-time-onboarding-overlay');
  const nameInput = page.locator('#first-time-name-input');
  const landingNameInput = page.locator('#landing-user-name-input');
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if (await overlay.isVisible().catch(() => false)) {
      await nameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nameInput.fill('');
      await nameInput.fill(displayName);
      await page.locator('#first-time-submit-btn').click();
      await expect(overlay).toBeHidden({ timeout: 10000 });
      break;
    }

    if (await landingPage.isVisible().catch(() => false)) {
      if (await landingNameInput.isVisible().catch(() => false)) {
        await landingNameInput.fill(displayName);
        await page.locator('#hero-create-workspace-btn').click();
      } else {
        await page.locator('#hero-create-workspace-btn').click();
      }
      await page.waitForTimeout(500);
      continue;
    }

    // Shell chrome is up — wait briefly for a late onboarding mount after identity load
    const shellReady =
      (await page.locator('#main-channel-header').isVisible().catch(() => false)) ||
      (await page.locator('#workspace-header-menu-btn').isVisible().catch(() => false)) ||
      (await page.locator('#mobile-nav-bar').isVisible().catch(() => false));

    if (shellReady) {
      await page.waitForTimeout(600);
      if (await overlay.isVisible().catch(() => false)) {
        continue; // handle on next loop
      }
      break;
    }

    await page.waitForTimeout(200);
  }

  // Final guard — overlay must not intercept clicks
  if (await overlay.isVisible().catch(() => false)) {
    await nameInput.fill(displayName);
    await page.locator('#first-time-submit-btn').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });
  }

  await expect(overlay).toBeHidden();
  await expect(page.locator('#openslack-root-shell')).toBeVisible();
}

/** Navigate to app root and finish onboarding. */
export async function openWorkspace(page: Page, displayName = 'Alice Reviewer'): Promise<void> {
  await page.goto('./');
  await ensureOnboardingCompleted(page, displayName);
}
