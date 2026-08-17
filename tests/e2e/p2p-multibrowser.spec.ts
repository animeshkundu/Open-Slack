import { expect, test } from '@playwright/test';
import { ensureOnboardingCompleted, injectNostrRelayMocks } from './helpers';

async function createWorkspace(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.locator('#add-workspace-rail-btn').click();
  await expect(page.locator('#join-workspace-modal-card')).toBeVisible();
  await page.locator('#create-ws-name-input').fill(name);
  await page.locator('#submit-create-ws-btn').click();
  await expect(page.locator('#workspace-header-menu-btn')).toContainText(name);
}

test.describe('Multi-Browser P2P Interaction & CRDT Synchronization', () => {
  test('opens the exact invited workspace in two isolated browser contexts', async ({ browser }) => {
    // 1. Create Peer A Context
    const contextA = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    await injectNostrRelayMocks(contextA);
    const pageA = await contextA.newPage();
    await pageA.goto('./');
    await ensureOnboardingCompleted(pageA, 'Peer A');
    const workspaceName = `Invite workspace ${Date.now()}`;
    await createWorkspace(pageA, workspaceName);

    // Get active workspace name from page A
    const wsNameA = await pageA.locator('#workspace-header-menu-btn').textContent();

    // 2. Open Invite Modal on Peer A and copy invite hash payload
    await pageA.locator('#workspace-header-menu-btn').click();
    await pageA.locator('#ws-menu-invite-btn').click();
    await expect(pageA.locator('#invite-modal-card')).toBeVisible();

    const inviteLinkInput = pageA.locator('#invite-link-input');
    const inviteUrl = await inviteLinkInput.inputValue();
    expect(inviteUrl).toContain('#invite=');

    await pageA.locator('#close-invite-modal-btn').click();

    // 3. Create Peer B Context in isolated incognito session
    const contextB = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    await injectNostrRelayMocks(contextB);
    const pageB = await contextB.newPage();
    await pageB.goto(inviteUrl);
    await ensureOnboardingCompleted(pageB, 'Peer B');

    // Verify Peer B lands on the EXACT same workspace as Peer A
    const wsNameB = await pageB.locator('#workspace-header-menu-btn').textContent();
    expect(wsNameB?.trim()).toBe(wsNameA?.trim());

    // Clean up
    await contextA.close();
    await contextB.close();
  });

  test('pairs secondary linked device via device-sync URL and syncs workspace', async ({ browser }) => {
    // 1. Create Primary Device Context
    const contextA = await browser.newContext();
    await injectNostrRelayMocks(contextA);
    const pageA = await contextA.newPage();
    await pageA.goto('./');
    await ensureOnboardingCompleted(pageA, 'Primary User');
    const workspaceName = `Paired workspace ${Date.now()}`;
    await createWorkspace(pageA, workspaceName);

    const wsNameA = await pageA.locator('#workspace-header-menu-btn').textContent();

    // 2. Open User Settings -> Linked Devices
    await pageA.locator('#sidebar-user-profile-btn, #workspace-user-profile-btn').first().click();
    await expect(pageA.locator('#user-settings-modal-card')).toBeVisible();

    const linkedDevicesBtn = pageA.locator('#tab-linked-devices-btn');
    await linkedDevicesBtn.scrollIntoViewIfNeeded();
    await linkedDevicesBtn.click({ force: true });
    await expect(pageA.locator('#linked-device-qr-img')).toBeVisible({ timeout: 10000 });

    const urlInput = pageA.locator('#linked-device-url-input');
    await expect(urlInput).toBeVisible();
    const syncUrl = await urlInput.inputValue();
    expect(syncUrl).toContain('#device-sync=');

    await pageA.locator('#close-settings-modal').click();

    // 3. Open Secondary Device Context navigating directly to device-sync URL
    const contextB = await browser.newContext();
    await injectNostrRelayMocks(contextB);
    const pageB = await contextB.newPage();
    await pageB.goto(syncUrl);

    // Secondary device should bypass onboarding and load with identical workspace
    await expect(pageB.locator('#main-channel-header')).toBeVisible({ timeout: 10000 });
    await expect(pageB.locator('#workspace-header-menu-btn')).toHaveText(wsNameA?.trim() || '', { timeout: 10000 });

    // Clean up
    await contextA.close();
    await contextB.close();
  });

  test('two browsers join the same channel huddle and start screen sharing', async ({ browser }) => {
    // 1. Create Peer A Context
    const contextA = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    await injectNostrRelayMocks(contextA);
    const pageA = await contextA.newPage();
    await pageA.goto('./');
    await ensureOnboardingCompleted(pageA, 'Alice');
    const workspaceName = `Huddle workspace ${Date.now()}`;
    await createWorkspace(pageA, workspaceName);

    // Get invite url
    await pageA.locator('#workspace-header-menu-btn').click();
    await pageA.locator('#ws-menu-invite-btn').click();
    const inviteUrl = await pageA.locator('#invite-link-input').inputValue();
    await pageA.locator('#close-invite-modal-btn').click();

    // Peer A starts huddle
    const huddleBtnA = pageA.locator('#channel-huddle-btn');
    await expect(huddleBtnA).toBeVisible();
    await huddleBtnA.click();
    await expect(pageA.locator('#huddle-floating-dock')).toBeVisible({ timeout: 10000 });

    // 2. Peer B joins same workspace via invite link
    const contextB = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    await injectNostrRelayMocks(contextB);
    const pageB = await contextB.newPage();
    await pageB.goto(inviteUrl);
    await ensureOnboardingCompleted(pageB, 'Bob');

    // Peer B joins huddle on same channel
    const huddleBtnB = pageB.locator('#channel-huddle-btn');
    await expect(huddleBtnB).toBeVisible();
    await huddleBtnB.click();
    await expect(pageB.locator('#huddle-floating-dock')).toBeVisible({ timeout: 10000 });

    // Both peers are in the active huddle for the same channel.
    await pageA.locator('#huddle-expand-btn').click();
    await expect(pageA.locator('#huddle-expanded-modal')).toContainText('Huddle in #general');
    await pageB.locator('#huddle-expand-btn').click();
    await expect(pageB.locator('#huddle-expanded-modal')).toContainText('Huddle in #general');

    await pageA.locator('#huddle-screen-btn-exp').click();
    await expect(pageA.locator('#huddle-screen-btn-exp')).toHaveClass(/bg-emerald-600/);
    await pageB.locator('#huddle-screen-btn-exp').click();
    await expect(pageB.locator('#huddle-screen-btn-exp')).toHaveClass(/bg-emerald-600/);

    await pageA.locator('#huddle-leave-btn-exp').click();
    await pageB.locator('#huddle-leave-btn-exp').click();

    await expect(pageA.locator('#huddle-floating-dock')).not.toBeVisible();
    await expect(pageB.locator('#huddle-floating-dock')).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
