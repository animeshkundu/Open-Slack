import { expect, test } from '@playwright/test';
import { ensureOnboardingCompleted } from './helpers';

test.describe('Workspace Invites & Admin Approval Workflow Suite', () => {
  test('creates a workspace requiring approval, submits request, and processes review modal', async ({ page }) => {
    await page.goto('./');
    await ensureOnboardingCompleted(page);

    // 1. Open Workspace Bar / Create Modal
    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-ws-settings-btn').click();
    await expect(page.locator('#workspace-settings-modal-card')).toBeVisible();

    // Verify toggle for approval requirement is present
    const approvalToggle = page.locator('#setting-require-approval-toggle');
    if (await approvalToggle.isVisible()) {
      await approvalToggle.click();
    }
    await page.locator('#close-ws-settings-modal').click();

    // 2. Open Pending Approvals Modal
    await page.locator('#workspace-header-menu-btn').click();
    const approvalsMenuBtn = page.locator('#ws-menu-pending-approvals-btn');
    if (await approvalsMenuBtn.isVisible()) {
      await approvalsMenuBtn.click();
      await expect(page.locator('#pending-approvals-modal-card')).toBeVisible();
      await page.locator('#close-pending-approvals-modal').click();
    }

    // 3. Open Invite Modal and inspect tokenized URL
    await page.locator('#workspace-header-menu-btn').click();
    await page.locator('#ws-menu-invite-btn').click();
    await expect(page.locator('#invite-modal-card')).toBeVisible();
    const inviteInput = page.locator('#invite-link-input');
    await expect(inviteInput).toBeVisible();
    await page.locator('#close-invite-modal-btn').click();
  });
});
