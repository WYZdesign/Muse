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

  // Requirement (Torreé): every placeholder card on Discover must be swipeable —
  // not just the first one. A PASS (left) has no notification path in demo mode,
  // so it deterministically advances; this drives the real pointer gesture
  // (onPointerUp commits when a horizontal drag clears 80px) and then repeats,
  // proving the deck keeps advancing past card 1.
  //
  // Regression this pins: `.card-info-scroll` is z-index 2 over `.card-hero`
  // (z-index 1) and spans the whole card, so it is the reported target for
  // nearly every point on the photo. useSwipeActions used to return from
  // onPointerDown without arming the drag for that target, which meant a drag
  // started anywhere on the card could never commit — the deck only advanced
  // from the radial-menu buttons.
  test('a drag advances the deck through consecutive placeholder cards', async ({ page }) => {
    test.setTimeout(180_000);

    // The deck is motion-heavy (card transforms, animated backdrop, particles).
    // Under Playwright's software renderer that work starves the main thread, so
    // input dispatch stalls for tens of seconds and a drag appears to hang even
    // though the gesture itself is fine. The app honors prefers-reduced-motion,
    // so asking for it exercises the same swipe path with the render load off.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // If the app's pointer handlers ever block the renderer main thread, a
    // mouse action never returns and the failure is a bare "test timeout".
    // A 200ms heartbeat plus captured page/console errors turns that into a
    // diagnosable message instead.
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(`pageerror: ${String(e).slice(0, 300)}`));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console: ${m.text().slice(0, 300)}`); });
    // layout.tsx's watchdog calls location.reload() when it decides the app has
    // frozen. A reload mid-gesture destroys the deck state, so record it.
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) pageErrors.push(`NAVIGATED ${frame.url()}`);
    });
    await page.evaluate(() => {
      const w = window as unknown as { __hb?: { max: number; n: number; last: number }; __hbId?: number };
      w.__hb = { max: 0, n: 0, last: performance.now() };
      w.__hbId = window.setInterval(() => {
        const now = performance.now();
        if (!w.__hb) return;
        w.__hb.max = Math.max(w.__hb.max, now - w.__hb.last);
        w.__hb.n += 1;
        w.__hb.last = now;
      }, 200);
    });
    const heartbeat = async () => page.evaluate(() => {
      const w = window as unknown as { __hb?: { max: number; n: number } };
      // A missing __hb means the page was replaced (watchdog reload) since the
      // heartbeat was installed; that is a different fact from "no stalls".
      return w.__hb ? { max: Math.round(w.__hb.max), n: w.__hb.n } : { missing: true };
    }).catch((e) => ({ evalFailed: String(e).slice(0, 120) }));

    /** Run a mouse action, but never let it hang the whole test: a blocked
     *  renderer shows up as a stalled heartbeat with the errors that led to it. */
    const timed = async <T,>(label: string, ms: number, fn: () => Promise<T>): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Never await page work here: if the renderer is wedged, an evaluate
          // never returns and the rejection below would never be raised.
          const readHb = heartbeat();
          const bounded = Promise.race([
            readHb,
            new Promise<null>((r) => setTimeout(() => r(null), 1500)),
          ]) as Promise<unknown>;
          void bounded.then((hb) => {
            reject(new Error(`${label} hung (${ms}ms); heartbeat=${JSON.stringify(hb)} errors=${JSON.stringify(pageErrors.slice(-4))}`));
          });
        }, ms);
      });
      try {
        return await Promise.race([fn(), timeout]);
      } finally { clearTimeout(timer); }
    };

    /** Poll for the top card with fresh evaluate() calls and keep the observed
     *  counts. waitForSelector sat through a 10s timeout in this spec while the
     *  same selector evaluated to 1 match, so the result has to be observable
     *  from inside the test rather than trusted. */
    const waitForTop = async (ms: number): Promise<{ counts: number[]; elapsed: number }> => {
      const t0 = Date.now();
      const counts: number[] = [];
      for (;;) {
        const n = await page.evaluate(() =>
          document.querySelectorAll('.card-stack .swipe-card.top-card').length
        ).catch(() => -1);
        counts.push(n);
        if (n > 0) return { counts, elapsed: Date.now() - t0 };
        if (Date.now() - t0 >= ms) return { counts, elapsed: Date.now() - t0 };
        await new Promise((r) => setTimeout(r, 150));
      }
    };

    /** Drag left from a point onPointerDown will actually arm from: never a
     *  button/link (those bail out) and never inside .card-prompts (that
     *  subtree stops pointer propagation). */
    const dragLeft = async () => {
      const waited = await waitForTop(8000);
      if (waited.counts[waited.counts.length - 1] <= 0) {
        const state = await page.evaluate(() => {
          const stack = document.querySelector('.card-stack');
          const cards = Array.from(document.querySelectorAll('.swipe-card'));
          return {
            hasStack: !!stack,
            stackTopCount: document.querySelectorAll('.card-stack .swipe-card.top-card').length,
            cardCount: cards.length,
            classes: cards.map((c) => c.className).slice(0, 5),
            names: cards.map((c) => (c.querySelector('.card-hero-name') as HTMLElement | null)?.textContent?.trim() ?? '').slice(0, 6),
            bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
          };
        }).catch(() => null);
        const hb = await heartbeat();
        throw new Error(
          `deck vanished (no .top-card): polls=${JSON.stringify(waited)} state=${JSON.stringify(state)} heartbeat=${JSON.stringify(hb)} errors=${JSON.stringify(pageErrors.slice(-4))}`,
        );
      }
      const box = await page.locator(TOP_CARD).first().boundingBox();
      if (!box) throw new Error('no top card to drag');
      const x = box.x + box.width / 2;
      let y = box.y + box.height * 0.3;
      for (const f of [0.3, 0.2, 0.45, 0.6]) {
        const candY = box.y + box.height * f;
        const ok = await page.evaluate(([px, py]) => {
          const el = document.elementFromPoint(px, py) as HTMLElement | null;
          if (!el) return false;
          if (el.closest('button, a, [role="button"], .card-prompts')) return false;
          // Prefer the bare info-scroll/hero surface itself rather than a
          // descendant that may stop propagation.
          return el.classList.contains('card-info-scroll') || !!el.closest('.card-hero') || el.classList.contains('swipe-card');
        }, [x, candY]);
        if (ok) { y = candY; break; }
      }
      await timed('mouse.move', 20_000, () => page.mouse.move(x, y));
      await timed('mouse.down', 20_000, () => page.mouse.down());
      await timed('mouse.drag', 20_000, () => page.mouse.move(x - 180, y, { steps: 6 }));
      await timed('mouse.up', 20_000, () => page.mouse.up());
    };

    // Read the name without locator auto-waiting: an empty deck must resolve to
    // '' immediately instead of hanging the poll until the whole test times out.
    const topName = async () =>
      (await page.evaluate(() => {
        const el = document.querySelector('.card-stack .swipe-card.top-card .card-hero-name');
        return el ? (el.textContent || '').trim() : '';
      }).catch(() => '')) || '';

    const firstName = await topName();
    expect(firstName.length).toBeGreaterThan(1);

    const names = [firstName];
    // Two consecutive swipes: the second only works if the first advanced.
    for (let i = 0; i < 2; i++) {
      const before = names[names.length - 1];
      let advanced = false;
      // One retry: pointer-event simulation is not perfectly deterministic
      // (the card can be mid-swap when the next drag starts), but if the
      // swipe path is broken both attempts still fail the assertion below.
      for (let attempt = 0; attempt < 2 && !advanced; attempt++) {
        await dragLeft();
        try {
          await expect.poll(topName, { timeout: 3500 }).not.toBe(before);
          advanced = true;
        } catch {
          /* retry the drag */
        }
      }
      expect(advanced, `swipe ${i + 1} did not advance the deck (still "${before}")`).toBe(true);
      names.push(await topName());
      // Let the 500ms swipe lock in useSwipeActions release before the next drag.
      await page.waitForTimeout(700);
    }
    expect(new Set(names).size, 'each swipe should land on a different card').toBe(3);
  });
});
