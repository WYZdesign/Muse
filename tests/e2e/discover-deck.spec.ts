import { test, expect } from '../fixtures/test-fixtures';
import { loginAsDemoUser, dismissPageTour } from '../helpers/test-helpers';

/**
 * Discover deck behaviour, asserted against the REAL DiscoverScreen DOM.
 *
 * HISTORY / WHY THIS FILE WAS REWRITTEN: the previous version used selectors
 * that DiscoverScreen has never exposed — `[data-queued]`, `[data-card-index]`,
 * `[data-super-like]`, `[data-open-filter]`, `[data-animation]`, `.filter-modal`,
 * `[data-save-search]`, `[data-distance-display]` … DiscoverScreen contains
 * exactly one `data-*` attribute (`data-screen`). Those tests either failed on
 * "element(s) not found" or passed vacuously, so they tested nothing.
 *
 * Real hooks used here:
 *   - `.card-stack` → `role="region"`, `aria-label="Swipe cards to discover creatives"`
 *   - `.swipe-card.top-card` → the live card; the two queued depth cards get
 *     `aria-hidden` + `inert` + `pointer-events:none`
 *   - `[aria-label="Match actions"]` → the "M" FAB; the swipe buttons only exist
 *     inside `#match-radial-menu` (`.match-radial`), which is `pointer-events:none`
 *     until `.open` and whose buttons animate opacity 0→1 / scale 0→1
 *   - `.card-hero-name` → the top profile's name
 *   - `[aria-label="Discovery Preferences"]` → header settings dialog
 *
 * Deliberately NOT asserted:
 *   - Keyboard arrow navigation — DiscoverScreen's only keydown handler closes
 *     the search on Escape; there is no ArrowLeft/ArrowRight deck control.
 *   - Swipe *outcomes* (advance / match toast) — `doSwipe` in page.tsx returns
 *     early in `DEMO_MODE` for the notification path and can interpose the
 *     intent picker for a right-swipe with no default intent, so an outcome
 *     assertion here would be testing the demo harness, not the deck.
 */

const CARD_STACK = '.card-stack';
const TOP_CARD = `${CARD_STACK} .swipe-card.top-card`;
const TOP_NAME = `${TOP_CARD} .card-hero-name`;
const QUEUED_CARD = `${CARD_STACK} .swipe-card[inert][aria-hidden="true"]`;
const MATCH_FAB = 'button[aria-label="Match actions"]';
const RADIAL_PASS = '.match-radial.open .match-radial-btn[aria-label="Pass"]';

type PwPage = import('@playwright/test').Page;

async function topName(page: PwPage): Promise<string> {
  return ((await page.locator(TOP_NAME).first().textContent()) || '').trim();
}

/** Open the "M" radial action menu; its buttons do not exist until it is open. */
async function openMatchMenu(page: PwPage): Promise<void> {
  const fab = page.locator(MATCH_FAB).first();
  await expect(fab).toBeVisible({ timeout: 8000 });
  await fab.click();
  // Wait on a BUTTON, not the `.match-radial` container: the container is a
  // zero-size box (all its children are absolutely positioned), so `toBeVisible`
  // can never pass on it.
  await expect(page.locator(RADIAL_PASS)).toBeVisible({ timeout: 6000 });
}

test.describe('Discover Deck', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await dismissPageTour(page);
    await page.waitForSelector('[data-screen="discover"].active, [data-screen="discover"]', { timeout: 15000 });
    await page.waitForSelector(TOP_CARD, { timeout: 15000 });
    await dismissPageTour(page);
  });

  test('Deck renders a visible top card with a profile name', async ({ page }) => {
    await expect(page.locator(CARD_STACK)).toHaveAttribute('role', 'region');
    await expect(page.locator(CARD_STACK)).toHaveAttribute('aria-label', 'Swipe cards to discover creatives');
    const name = page.locator(TOP_NAME).first();
    await expect(name).toBeVisible({ timeout: 8000 });
    expect(await topName(page)).not.toBe('');
  });

  test('Queued depth cards are aria-hidden, inert and not hit-testable', async ({ page }) => {
    const queued = page.locator(QUEUED_CARD);
    const queuedCount = await queued.count();
    expect(queuedCount).toBeGreaterThan(0);
    for (let i = 0; i < queuedCount; i++) {
      await expect(queued.nth(i)).toHaveAttribute('aria-hidden', 'true');
      await expect(queued.nth(i)).toHaveAttribute('inert', '');
      await expect(queued.nth(i)).toHaveCSS('pointer-events', 'none');
    }
    // …and the top card must NOT be hidden or inert.
    const top = page.locator(TOP_CARD).first();
    await expect(top).not.toHaveAttribute('aria-hidden', 'true');
    await expect(top).not.toHaveAttribute('inert', '');
  });

  test('Queued cards retain their cover image when the active card photo changes', async ({ page }) => {
    const queuedHero = page.locator(`${QUEUED_CARD} .card-hero img`).first();
    await expect(queuedHero).toBeVisible({ timeout: 8000 });
    const queuedSrc = await queuedHero.getAttribute('src');
    expect(queuedSrc).toBeTruthy();

    const nextZone = page.locator(`${TOP_CARD} [aria-label="Next photo"]`).first();
    // A profile with one photo has no carousel; in that case there is no state
    // to leak to the queued cards and this assertion is already satisfied.
    if (await nextZone.count()) {
      const topHero = page.locator(`${TOP_CARD} .card-hero img`).first();
      const topSrc = await topHero.getAttribute('src');
      await nextZone.click();
      await expect(topHero).not.toHaveAttribute('src', topSrc!);
      await expect(queuedHero).toHaveAttribute('src', queuedSrc!);
    }
  });

  test('Prompts remain a simple wide carousel without a prompt-like control', async ({ page }) => {
    await expect(page.locator('.card-prompt-like-btn')).toHaveCount(0);
  });

  test('Match actions menu exposes labelled swipe buttons that meet 44px', async ({ page }) => {
    await openMatchMenu(page);
    const labels = ['Pass', 'Super Like', 'Like this match', 'Like + Note'];
    for (const label of labels) {
      const btn = page.locator(`.match-radial-btn[aria-label="${label}"]`).first();
      await expect(btn, `${label} should be rendered`).toBeVisible({ timeout: 5000 });
      // The buttons enter with `transform: scale(0) → scale(1)` over 0.5s on an
      // overshoot bezier (.22,1.4,.36,1) and then float on an infinite
      // `radialFloat` keyframe. A single immediate `boundingBox()` can land
      // mid-ramp and read e.g. 41.1px for a button that renders at 44px, which
      // is exactly how this failed in CI. Poll until the box settles >= 44.
      await expect
        .poll(async () => (await btn.boundingBox())?.width ?? 0, { timeout: 6000 })
        .toBeGreaterThanOrEqual(44);
      await expect
        .poll(async () => (await btn.boundingBox())?.height ?? 0, { timeout: 6000 })
        .toBeGreaterThanOrEqual(44);
    }
  });

  test('Match actions menu opens and closes from the FAB', async ({ page }) => {
    await openMatchMenu(page);
    await expect(page.locator(RADIAL_PASS)).toBeVisible();
    await page.locator(MATCH_FAB).first().click();
    await expect(page.locator(RADIAL_PASS)).toBeHidden({ timeout: 5000 });
  });

  test('Discovery Preferences opens and Escape closes it', async ({ page }) => {
    await page.locator('button[aria-label="Discovery Preferences"]').first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 6000 });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });
});
