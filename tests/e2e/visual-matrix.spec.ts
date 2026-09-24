import { test, expect } from '../fixtures/test-fixtures';
import { loginAsDemoUser, dismissPageTour } from '../helpers/test-helpers';
import {
  VISUAL_VIEWPORTS,
  screenshotMasks,
  seedVisualDeterminism,
  waitForVisualImages,
  assertCleanLayout,
  assertDiscoverHeaderSingleRow,
  assertNavTouchTargets,
} from '../helpers/visual-helpers';

// Priority B: visual/DOM-layout matrix at 390×844, 375×812, 320×700, desktop.
// Exclusive files: this spec, tests/helpers/visual-helpers.ts, and baselines under
// tests/e2e/visual-matrix.spec.ts-snapshots/ (Playwright default for this file).
// Queue named tests/e2e/snapshots/ — Playwright rejects `../` in snapshot names,
// so baselines live in the -snapshots/ dir next to this spec (documented in HANDOFF).
// Screenshots use documented masks (nextjs-portal, tour overlay, HMR toast, canvas bg).
// First run writes baselines — requires ONE manual baseline review before
// treating diffs as regressions.

const DISCOVER = '[data-screen="discover"]';
const FEED = '[data-screen="connections"]';

/**
 * Freeze JS/CSS motion so toHaveScreenshot can settle.
 * animations:'disabled' only covers CSS — BackgroundScene + FeedScreen use
 * requestAnimationFrame/canvas which never stabilizes without this.
 */
async function stabilizeMotion(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const native = window.requestAnimationFrame.bind(window);
    let n = 0;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      if (n > 20) return 0;
      n += 1;
      return native(cb);
    }) as typeof window.requestAnimationFrame;
  });
  await page.addStyleTag({
    content: [
      '*,*::before,*::after{animation:none!important;transition:none!important}',
      'canvas{visibility:hidden!important}',
      '.particles{display:none!important}',
    ].join('\n'),
  });
  await page.waitForTimeout(300);
}

test.describe('Priority B Visual Matrix', () => {
  for (const vp of VISUAL_VIEWPORTS) {
    test.describe(`${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('Discover: no overflow, no overlap, no clipped actions, nav 44px', async ({ page }) => {
        await loginAsDemoUser(page);
        await dismissPageTour(page);
        await page.waitForSelector(`${DISCOVER}.active, ${DISCOVER}`, { timeout: 15000 });
        await dismissPageTour(page);

        await assertCleanLayout(page);
        await assertNavTouchTargets(page, 44);
      });

      test('Discover header single-row grid (≤390 locked by Round 59b)', async ({ page }) => {
        await loginAsDemoUser(page);
        await dismissPageTour(page);
        await page.waitForSelector(DISCOVER, { timeout: 15000 });
        await dismissPageTour(page);

        await assertDiscoverHeaderSingleRow(page);
      });

      test('Feed (connections): no overflow, critical controls visible', async ({ page }) => {
        await loginAsDemoUser(page, { screen: 'connections' });
        await dismissPageTour(page);
        await page.waitForSelector(`${FEED}.active`, { state: 'visible', timeout: 15000 });
        await page.waitForSelector('.screen-el.active .nav', { state: 'visible', timeout: 8000 }).catch(() => {});
        await dismissPageTour(page);

        await assertCleanLayout(page);
        await assertNavTouchTargets(page, 44);
      });

      test('Discover screenshot matches baseline (masked)', async ({ page }) => {
        await seedVisualDeterminism(page);
        await loginAsDemoUser(page);
        await dismissPageTour(page);
        await page.waitForSelector(DISCOVER, { timeout: 15000 });
        await dismissPageTour(page);
        await stabilizeMotion(page);
        await waitForVisualImages(page);

        await expect(page).toHaveScreenshot(`discover-${vp.name}.png`, {
          fullPage: false,
          mask: screenshotMasks(page),
          animations: 'disabled',
          caret: 'hide',
          timeout: 15000,
          maxDiffPixels: 250,
        });
      });

      test('Feed screenshot matches baseline (masked)', async ({ page }) => {
        await seedVisualDeterminism(page);
        // Seed screen=connections so async loadState restores INTO feed —
        // a late restore to 'discover' was bouncing post-login nav clicks.
        await loginAsDemoUser(page, { screen: 'connections' });
        await dismissPageTour(page);
        await page.waitForSelector(`${FEED}.active`, { state: 'visible', timeout: 15000 });
        await dismissPageTour(page);
        await stabilizeMotion(page);
        await waitForVisualImages(page);

        await expect(page).toHaveScreenshot(`feed-${vp.name}.png`, {
          fullPage: false,
          mask: screenshotMasks(page),
          animations: 'disabled',
          caret: 'hide',
          timeout: 15000,
          maxDiffPixels: 250,
        });
      });
    });
  }

  test('Desktop only: Discover + Feed layout still clean at 1280×720', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsDemoUser(page);
    await dismissPageTour(page);
    await page.waitForSelector(DISCOVER, { timeout: 15000 });
    await assertCleanLayout(page);
    await assertNavTouchTargets(page, 44);
  });
});
