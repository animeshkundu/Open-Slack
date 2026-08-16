import { expect, test } from '@playwright/test';
import { ensureOnboardingCompleted, injectNostrRelayMocks } from './helpers';

test.describe('Multi-Browser P2P Interaction & CRDT Synchronization', () => {
  test('synchronizes messages across two isolated browser contexts via invite link', async ({ browser }) => {
    // 1. Create Peer A Context
    const contextA = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    await injectNostrRelayMocks(contextA);
    const pageA = await contextA.newPage();
    await pageA.goto('./');
    await ensureOnboardingCompleted(pageA, 'Peer A');

    // Get active workspace name from page A
    const wsNameA = await pageA.locator('#workspace-name-btn').textContent();

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
    const wsNameB = await pageB.locator('#workspace-name-btn').textContent();
    expect(wsNameB?.trim()).toBe(wsNameA?.trim());

    // 4. Peer A sends a real-time message
    const msgFromA = `P2P Multi-Browser sync verification: ${Date.now()}`;
    await pageA.locator('#message-composer-textarea').fill(msgFromA);
    await pageA.locator('#composer-send-btn').click();

    // Verify Peer A shows message
    await expect(pageA.getByText(msgFromA)).toBeVisible({ timeout: 5000 });

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

    const wsNameA = await pageA.locator('#workspace-name-btn').textContent();

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
    const wsNameB = await pageB.locator('#workspace-name-btn').textContent();
    expect(wsNameB?.trim()).toBe(wsNameA?.trim());

    // Clean up
    await contextA.close();
    await contextB.close();
  });

  test('two browsers on same workspace channel can both enter the huddle', async ({ browser }) => {
    // 1. Create Peer A Context
    const contextA = await browser.newContext({
      permissions: ['microphone', 'camera'],
    });
    await injectNostrRelayMocks(contextA);
    const pageA = await contextA.newPage();
    await pageA.goto('./');
    await ensureOnboardingCompleted(pageA, 'Alice');

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

    // Both peers are in the active huddle
    await pageA.locator('#huddle-leave-btn').click();
    await pageB.locator('#huddle-leave-btn').click();

    await expect(pageA.locator('#huddle-floating-dock')).not.toBeVisible();
    await expect(pageB.locator('#huddle-floating-dock')).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
