import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createMediaContext, ensureOnboardingCompleted, injectNostrRelayMocks, openWorkspace, waitForPeerMesh } from './helpers';

async function createWorkspace(page: Page, name: string): Promise<void> {
  await page.locator('#add-workspace-rail-btn').click();
  await expect(page.locator('#join-workspace-modal-card')).toBeVisible();
  await page.locator('#create-ws-name-input').fill(name);
  await page.locator('#submit-create-ws-btn').click();
  await expect(page.locator('#workspace-header-menu-btn')).toContainText(name);
}

async function getInviteUrl(page: Page): Promise<string> {
  await page.locator('#workspace-header-menu-btn').click();
  await page.locator('#ws-menu-invite-btn').click();
  await expect(page.locator('#invite-modal-card')).toBeVisible();
  const inviteUrl = await page.locator('#invite-link-input').inputValue();
  await page.locator('#close-invite-modal-btn').click();
  return inviteUrl;
}

async function openPeer(
  browser: Browser,
  displayName: string,
  url = './'
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await createMediaContext(browser);
  await injectNostrRelayMocks(context);
  const page = await context.newPage();
  await page.goto(url);
  await ensureOnboardingCompleted(page, displayName);
  return { context, page };
}

test.describe('Huddle single-client controls', () => {
  test.beforeEach(async ({ page }) => {
    await openWorkspace(page);
  });

  test('can start, minimize to floating dock, toggle audio/video, and leave huddle', async ({ page }) => {
    const huddleBtn = page.locator('#channel-huddle-btn');
    await expect(huddleBtn).toBeVisible();
    await huddleBtn.click();

    const dock = page.locator('#huddle-floating-dock');
    await expect(dock).toBeVisible({ timeout: 15000 });

    // Channel notice that a huddle was started
    await expect(page.locator('[data-huddle-notice="true"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-message-type="huddle_started"]').first()).toContainText(
      'started a huddle'
    );

    // Toggle Mic mute/unmute
    const micBtn = page.locator('#huddle-mute-btn');
    await expect(micBtn).toBeVisible();
    await micBtn.click();
    await expect(micBtn).toHaveClass(/bg-red-500/);
    await micBtn.click();
    await expect(micBtn).not.toHaveClass(/bg-red-500/);

    // Toggle Camera
    const camBtn = page.locator('#huddle-video-btn');
    await expect(camBtn).toBeVisible();
    await camBtn.click();
    await expect(camBtn).toHaveClass(/bg-blue-600/);

    // Expand to full stage overlay if available
    const expandBtn = page.locator('#huddle-expand-btn');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await expect(page.locator('#huddle-expanded-modal')).toBeVisible();
      // Minimize back to dock
      const minimizeBtn = page.locator('#minimize-huddle-btn');
      if (await minimizeBtn.isVisible()) {
        await minimizeBtn.click();
      }
    }

    // Switch channels while in huddle
    const randomChannel = page.locator('#sidebar-channel-random');
    if (await randomChannel.isVisible()) {
      await randomChannel.click();
      await expect(page.locator('#main-channel-header')).toContainText('random');
      // Dock should still be visible
      await expect(dock).toBeVisible();
    }

    // Leave huddle (notice is posted on the huddle's channel, usually #general)
    const leaveBtn = page.locator('#huddle-leave-btn');
    await leaveBtn.click();
    await expect(dock).not.toBeVisible();
    const generalChannel = page.locator('#sidebar-channel-general');
    if (await generalChannel.isVisible()) {
      await generalChannel.click();
    }
    await expect(page.locator('[data-message-type="huddle_ended"]').first()).toContainText(
      'left the huddle',
      { timeout: 10000 }
    );
  });
});

test.describe('Multi-browser huddle mesh', () => {
  test('two peers join the same channel huddle with names, media, screenshare, and disconnect', async ({
    browser,
  }) => {
    test.setTimeout(120000);
    const workspaceName = `Huddle Mesh ${Date.now()}`;
    const alice = await openPeer(browser, 'Alice Huddle');
    await createWorkspace(alice.page, workspaceName);
    const inviteUrl = await getInviteUrl(alice.page);

    // Alice starts the huddle first
    await alice.page.locator('#channel-huddle-btn').click();
    await expect(alice.page.locator('#huddle-floating-dock')).toBeVisible({ timeout: 15000 });
    await expect(alice.page.locator('[data-message-type="huddle_started"]').first()).toContainText(
      'Alice Huddle'
    );

    // Bob joins the same workspace via invite
    const bob = await openPeer(browser, 'Bob Huddle', inviteUrl);
    await expect(bob.page.locator('#workspace-header-menu-btn')).toContainText(workspaceName, {
      timeout: 20000,
    });

    // Wait for WebRTC mesh + CRDT notice before joining the same huddle room
    await waitForPeerMesh(alice.page, 1, 25000);
    await waitForPeerMesh(bob.page, 1, 25000);
    await expect(bob.page.locator('[data-message-type="huddle_started"]').first()).toContainText(
      'started a huddle',
      { timeout: 20000 }
    );

    // Bob joins the same channel huddle
    await bob.page.locator('#channel-huddle-btn').click();
    await expect(bob.page.locator('#huddle-floating-dock')).toBeVisible({ timeout: 15000 });

    // Expand both peers and wait until each sees 2 participants with real names
    await alice.page.locator('#huddle-expand-btn').click();
    await bob.page.locator('#huddle-expand-btn').click();
    await expect(alice.page.locator('#huddle-expanded-modal')).toBeVisible();
    await expect(bob.page.locator('#huddle-expanded-modal')).toBeVisible();

    await expect
      .poll(async () => alice.page.locator('[data-huddle-participant]').count(), { timeout: 25000 })
      .toBeGreaterThanOrEqual(2);
    await expect
      .poll(async () => bob.page.locator('[data-huddle-participant]').count(), { timeout: 25000 })
      .toBeGreaterThanOrEqual(2);

    // Real display names appear for both local and remote tiles
    await expect(alice.page.locator('#huddle-expanded-modal')).toContainText('Alice Huddle');
    await expect(alice.page.locator('#huddle-expanded-modal')).toContainText('Bob Huddle', {
      timeout: 25000,
    });
    await expect(bob.page.locator('#huddle-expanded-modal')).toContainText('Bob Huddle');
    await expect(bob.page.locator('#huddle-expanded-modal')).toContainText('Alice Huddle', {
      timeout: 25000,
    });

    // Avatars or initials are rendered for every participant tile
    const aliceTiles = alice.page.locator('[data-huddle-participant]');
    const bobTiles = bob.page.locator('[data-huddle-participant]');
    await expect(aliceTiles).toHaveCount(2, { timeout: 10000 });
    await expect(bobTiles).toHaveCount(2, { timeout: 10000 });
    for (const tile of await aliceTiles.all()) {
      const hasAvatar = (await tile.locator('[data-huddle-avatar], [data-huddle-avatar-fallback]').count()) > 0;
      const hasName = (await tile.getAttribute('data-huddle-participant-name')) || '';
      expect(hasName.length).toBeGreaterThan(0);
      expect(hasAvatar || hasName.length > 0).toBeTruthy();
    }

    // Camera on Alice should reflect in local UI
    await alice.page.locator('#huddle-video-btn-exp').click();
    await expect(alice.page.locator('#huddle-video-btn-exp')).toHaveClass(/bg-blue-600/);

    // Screen share on Alice
    await alice.page.locator('#huddle-screen-btn-exp').click();
    await expect(alice.page.locator('#huddle-screen-btn-exp')).toHaveClass(/bg-emerald-600/);

    // Bob should eventually observe Alice screen-sharing flag on a remote tile
    await expect
      .poll(
        async () =>
          bob.page.locator('[data-huddle-participant][data-huddle-screen-sharing="true"]').count(),
        { timeout: 25000 }
      )
      .toBeGreaterThanOrEqual(1);

    // Remote media streams should arrive for at least one non-local participant on each side
    await expect
      .poll(
        async () =>
          alice.page
            .locator('[data-huddle-participant][data-huddle-local="false"][data-huddle-has-stream="true"]')
            .count(),
        { timeout: 25000 }
      )
      .toBeGreaterThanOrEqual(1);
    await expect
      .poll(
        async () =>
          bob.page
            .locator('[data-huddle-participant][data-huddle-local="false"][data-huddle-has-stream="true"]')
            .count(),
        { timeout: 25000 }
      )
      .toBeGreaterThanOrEqual(1);

    // Alice leaves — Bob must drop Alice from the participant grid
    await alice.page.locator('#huddle-leave-btn-exp').click();
    await expect(alice.page.locator('#huddle-floating-dock')).not.toBeVisible();
    await expect(alice.page.locator('[data-message-type="huddle_ended"]').first()).toContainText(
      'left the huddle'
    );

    await expect
      .poll(async () => bob.page.locator('[data-huddle-participant]').count(), { timeout: 25000 })
      .toBe(1);
    await expect(bob.page.locator('#huddle-expanded-modal')).not.toContainText('Alice Huddle', {
      timeout: 15000,
    });

    await bob.page.locator('#huddle-leave-btn-exp').click();
    await expect(bob.page.locator('#huddle-floating-dock')).not.toBeVisible();

    await alice.context.close();
    await bob.context.close();
  });

  test('three peers in the same workspace/channel converge on one huddle room', async ({ browser }) => {
    test.setTimeout(150000);
    const workspaceName = `Triple Huddle ${Date.now()}`;
    const alice = await openPeer(browser, 'Alice Three');
    await createWorkspace(alice.page, workspaceName);
    const inviteUrl = await getInviteUrl(alice.page);

    const bob = await openPeer(browser, 'Bob Three', inviteUrl);
    const cara = await openPeer(browser, 'Cara Three', inviteUrl);

    await expect(bob.page.locator('#workspace-header-menu-btn')).toContainText(workspaceName, {
      timeout: 20000,
    });
    await expect(cara.page.locator('#workspace-header-menu-btn')).toContainText(workspaceName, {
      timeout: 20000,
    });

    // Ensure the three-way mesh is up before huddle signaling
    await waitForPeerMesh(alice.page, 2, 35000);
    await waitForPeerMesh(bob.page, 2, 35000);
    await waitForPeerMesh(cara.page, 2, 35000);

    // Stagger joins slightly to exercise join re-announce paths
    await alice.page.locator('#channel-huddle-btn').click();
    await expect(alice.page.locator('#huddle-floating-dock')).toBeVisible({ timeout: 15000 });

    await bob.page.locator('#channel-huddle-btn').click();
    await expect(bob.page.locator('#huddle-floating-dock')).toBeVisible({ timeout: 15000 });

    await cara.page.locator('#channel-huddle-btn').click();
    await expect(cara.page.locator('#huddle-floating-dock')).toBeVisible({ timeout: 15000 });

    for (const peer of [alice, bob, cara]) {
      await peer.page.locator('#huddle-expand-btn').click();
      await expect(peer.page.locator('#huddle-expanded-modal')).toContainText('Huddle in #general');
    }

    // Every peer should converge on 3 participants with real names
    for (const peer of [alice, bob, cara]) {
      await expect
        .poll(async () => peer.page.locator('[data-huddle-participant]').count(), {
          timeout: 35000,
        })
        .toBe(3);
      await expect(peer.page.locator('#huddle-expanded-modal')).toContainText('Alice Three');
      await expect(peer.page.locator('#huddle-expanded-modal')).toContainText('Bob Three');
      await expect(peer.page.locator('#huddle-expanded-modal')).toContainText('Cara Three');
    }

    // Cara disconnects hard (context close) — remaining peers drop her
    await cara.context.close();

    for (const peer of [alice, bob]) {
      await expect
        .poll(async () => peer.page.locator('[data-huddle-participant]').count(), {
          timeout: 35000,
        })
        .toBe(2);
      await expect(peer.page.locator('#huddle-expanded-modal')).not.toContainText('Cara Three');
    }

    await alice.page.locator('#huddle-leave-btn-exp').click();
    await bob.page.locator('#huddle-leave-btn-exp').click();
    await alice.context.close();
    await bob.context.close();
  });
});
