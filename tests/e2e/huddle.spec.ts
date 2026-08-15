import { expect, test } from '@playwright/test';

test.describe('Huddle Audio/Video Call Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('#openslack-root-shell')).toBeVisible();
  });

  test('can start, minimize to floating dock, toggle audio/video, and leave huddle', async ({ page }) => {
    const huddleBtn = page.locator('#channel-huddle-btn');
    await expect(huddleBtn).toBeVisible();
    await huddleBtn.click();

    // Verify floating dock appears
    const dock = page.locator('#huddle-floating-dock');
    await expect(dock).toBeVisible({ timeout: 15000 });

    // Toggle Mic mute/unmute
    const micBtn = page.locator('#huddle-mic-toggle-btn');
    if (await micBtn.isVisible()) {
      await micBtn.click();
    }

    // Toggle Camera
    const camBtn = page.locator('#huddle-cam-toggle-btn');
    if (await camBtn.isVisible()) {
      await camBtn.click();
    }

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

    // Leave huddle
    const leaveBtn = page.locator('#huddle-leave-btn');
    await leaveBtn.click();
    await expect(dock).not.toBeVisible();
  });
});
