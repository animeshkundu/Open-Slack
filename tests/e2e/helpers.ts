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
  const landingPage = page.locator('#open-slack-landing-page');
  const overlay = page.locator('#first-time-onboarding-overlay');
  const nameInput = page.locator('#first-time-name-input');
  const landingNameInput = page.locator('#landing-user-name-input');
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    if (await landingPage.isVisible().catch(() => false)) {
      if (await landingNameInput.isVisible().catch(() => false)) {
        await landingNameInput.fill(displayName);
      }
      await page.locator('#hero-create-workspace-btn').click();
      await page.waitForTimeout(500);
      continue;
    }

    if (await overlay.isVisible().catch(() => false)) {
      await nameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nameInput.fill('');
      await nameInput.fill(displayName);
      await page.locator('#first-time-submit-btn').click();
      await expect(overlay).toBeHidden({ timeout: 10000 });
      break;
    }

    const shellReady = await page.locator('#openslack-root-shell').isVisible().catch(() => false);
    if (shellReady) {
      await page.waitForTimeout(500);
      if (await overlay.isVisible().catch(() => false)) {
        continue;
      }
      break;
    }

    await page.waitForTimeout(200);
  }

  await expect(page.locator('#openslack-root-shell')).toBeVisible({ timeout: 10000 });
}

/** Navigate to app root and finish onboarding. */
export async function openWorkspace(page: Page, displayName = 'Alice Reviewer'): Promise<void> {
  await page.goto('./');
  await ensureOnboardingCompleted(page, displayName);
}
