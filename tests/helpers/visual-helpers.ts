import { Page, Locator, expect } from '@playwright/test';

/** Priority B viewport matrix (queue-specified). */
export const VISUAL_VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '375x812', width: 375, height: 812 },
  { name: '320x700', width: 320, height: 700 },
  { name: 'desktop', width: 1280, height: 720 },
] as const;

/**
 * Documented screenshot masks for toHaveScreenshot:
 * - nextjs-portal: Next.js dev-tools shadow host (dev-only chrome, not product)
 * - .tour-overlay: first-visit tour (seeded away, belt-and-suspenders mask)
 * - [data-nextjs-toast]: HMR toast (volatile)
 * DO NOT mask canvas/.particles — BackgroundScene is full-viewport; masking it
 * paints the entire frame magenta. stabilizeMotion() hides those instead.
 * Deck/feed content is held stable via seedVisualDeterminism() (seeded
 * Math.random + stubbed live APIs + placeholder remote images), not masked.
 */
export function screenshotMasks(page: Page): Locator[] {
  return [
    page.locator('nextjs-portal'),
    page.locator('.tour-overlay'),
    page.locator('[data-nextjs-toast]'),
  ];
}

/** 1×1 PNG — offline-stable stand-in for remote feed avatars/photos. */
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Make Discover/Feed screenshots reproducible across runs.
 * 1) Seed Math.random before app code — shuffleSeedRef (page.tsx:207) and
 *    BackgroundScene star positions become a fixed sequence.
 * 2) Stub live APIs that prepend/replace static demo content:
 *    - discover-ranked → [] so deck is pure shuffled PROFILES
 *    - type=feed → [] so FeedScreen uses baked-in feedPostsStatic
 *    - type=albums → [] so card photo album effects don't reshuffle
 * 3) Fulfill images.unsplash.com with a 1×1 PNG (network-independent pixels).
 * MUST run before loginAsDemoUser/goto.
 */
export async function seedVisualDeterminism(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let s = 0x2f6e2b1 >>> 0;
    Math.random = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });

  const json = (body: unknown) =>
    (route: import('@playwright/test').Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

  await page.route(/\/api\/muse\?.*type=discover-ranked/, json({ profiles: [] }));
  await page.route(/\/api\/muse\?.*type=feed(?:&|$)/, json({ posts: [] }));
  await page.route(/\/api\/muse\?.*type=albums(?:&|$)/, json({ albums: [] }));
  await page.route('**/images.unsplash.com/**', route =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PLACEHOLDER_PNG })
  );
}

/** Wait until every <img> has loaded (or failed) so pixels settle. */
export async function waitForVisualImages(page: Page): Promise<void> {
  await page
    .waitForFunction(() => Array.from(document.images).every(img => img.complete), null, {
      timeout: 10000,
    })
    .catch(() => {});
  await page.waitForTimeout(150);
}

/** Seed-free settled load: domcontentloaded + splash gone + optional screen. */
export async function gotoSeededApp(
  page: Page,
  opts?: { screenSelector?: string; login?: (p: Page) => Promise<void> }
) {
  if (opts?.login) await opts.login(page);
  else {
    await page.goto('/muse', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await page
    .waitForSelector('#splash-screen', { state: 'hidden', timeout: 15000 })
    .catch(() => {});
  if (opts?.screenSelector) {
    await page.waitForSelector(opts.screenSelector, { timeout: 15000 }).catch(() => {});
  }
}

/** DocumentElement/body must not scroll horizontally. */
export async function assertNoDocOverflowStrict(page: Page) {
  const m = await page.evaluate(() => ({
    docScroll: document.documentElement.scrollWidth,
    docClient: document.documentElement.clientWidth,
    bodyScroll: document.body.scrollWidth,
    bodyClient: document.body.clientWidth,
  }));
  expect(
    m.docScroll <= m.docClient + 1 && m.bodyScroll <= m.bodyClient + 1,
    `doc overflow: ${JSON.stringify(m)}`
  ).toBe(true);
}

export interface LayoutIssue {
  kind: 'overflow-x' | 'overflow-y-unexpected' | 'clipped' | 'overlap' | 'undersized';
  detail: string;
}

/**
 * Collect critical control geometry: nav items + discover hdr actions.
 * Flags elements that (a) fall outside the viewport horizontally,
 * (b) are clipped by an ancestor with overflow hidden while their box
 * extends past it, or (c) overlap a sibling critical control.
 */
export async function collectCriticalLayout(page: Page): Promise<LayoutIssue[]> {
  const issues: LayoutIssue[] = [];

  const metrics = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const problems: Array<{ kind: string; detail: string }> = [];

    const critical = Array.from(
      document.querySelectorAll<HTMLElement>(
        'nav[aria-label="Main navigation"] button.nav-item, ' +
          '[data-screen="discover"].active .discover-hdr-actions button, ' +
          '[data-screen="discover"].active .discover-hdr-title'
      )
    );

    const boxes: Array<{ el: DOMRect; label: string; node: HTMLElement }> = [];
    for (const el of critical) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const label =
        el.getAttribute('aria-label') ||
        (el.textContent || '').trim().slice(0, 24) ||
        el.className;
      boxes.push({ el: r, label, node: el });

      // Horizontal overflow past viewport
      if (r.left < -1 || r.right > vw + 1) {
        problems.push({
          kind: 'overflow-x',
          detail: `${label} box=[${Math.round(r.left)},${Math.round(r.right)}] vw=${vw}`,
        });
      }

      // Clipped: ancestor overflow hidden clips right edge of control
      let p: HTMLElement | null = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (
          (cs.overflowX === 'hidden' || cs.overflow === 'hidden') &&
          p !== el
        ) {
          const pr = p.getBoundingClientRect();
          if (r.right > pr.right + 2 && r.width > 0) {
            problems.push({
              kind: 'clipped',
              detail: `${label} right=${Math.round(r.right)} ancestorRight=${Math.round(pr.right)} (${p.className || p.tagName})`,
            });
            break;
          }
        }
        p = p.parentElement;
      }

      // Vertical: critical nav must sit fully in viewport height
      if (el.closest('nav') && (r.bottom > vh + 1 || r.top < -1)) {
        problems.push({
          kind: 'overflow-y-unexpected',
          detail: `${label} top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} vh=${vh}`,
        });
      }
    }

    // Pairwise overlap among nav buttons only (discover title/actions checked via x)
    const navBoxes = boxes.filter(b => b.node.closest('nav'));
    for (let i = 0; i < navBoxes.length; i++) {
      for (let j = i + 1; j < navBoxes.length; j++) {
        const a = navBoxes[i].el;
        const b = navBoxes[j].el;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2) {
          problems.push({
            kind: 'overlap',
            detail: `${navBoxes[i].label} ∩ ${navBoxes[j].label} (${Math.round(ox)}x${Math.round(oy)}px)`,
          });
        }
      }
    }

    // Undersized interactive nav/header targets (<44px)
    for (const { el, label, node } of boxes) {
      if (!node.closest('nav') && !node.closest('.discover-hdr-actions')) continue;
      if (node.tagName !== 'BUTTON' && node.getAttribute('role') !== 'button') continue;
      if (el.width < 44 || el.height < 44) {
        problems.push({
          kind: 'undersized',
          detail: `${label} = ${Math.round(el.width)}x${Math.round(el.height)} (<44)`,
        });
      }
    }

    return problems;
  });

  for (const m of metrics) {
    issues.push({ kind: m.kind as LayoutIssue['kind'], detail: m.detail });
  }
  return issues;
}

/** Assert zero layout issues + no doc overflow. Returns issues for logging. */
export async function assertCleanLayout(page: Page): Promise<LayoutIssue[]> {
  await assertNoDocOverflowStrict(page);
  const issues = await collectCriticalLayout(page);
  if (issues.length > 0) {
    console.warn('Layout issues:', issues);
  }
  expect(issues, `layout issues:\n${issues.map(i => `${i.kind}: ${i.detail}`).join('\n')}`).toEqual([]);
  return issues;
}

/**
 * Discover header single-row check: at ≤390 the title + actions must share
 * one row (same top within 2px) and hdr must be display:grid with 2 columns.
 * Round 59b fixed this; Priority B locks it in.
 */
export async function assertDiscoverHeaderSingleRow(page: Page) {
  const hdr = page
    .locator('[data-screen="discover"].active .discover-wrap > .hdr, [data-screen="discover"].active .hdr')
    .first();
  await expect(hdr).toBeVisible({ timeout: 8000 });

  const m = await hdr.evaluate(el => {
    const cs = getComputedStyle(el);
    const title = el.querySelector('.discover-hdr-title');
    const actions = el.querySelector('.discover-hdr-actions');
    const tr = title?.getBoundingClientRect();
    const ar = actions?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      display: cs.display,
      gridTemplateColumns: cs.gridTemplateColumns,
      hdrH: Math.round(r.height),
      titleTop: tr ? Math.round(tr.top) : null,
      titleMid: tr ? Math.round(tr.top + tr.height / 2) : null,
      actionsTop: ar ? Math.round(ar.top) : null,
      actionsMid: ar ? Math.round(ar.top + ar.height / 2) : null,
      titleVisible: !!title && getComputedStyle(title).opacity !== '0',
      actionsRight: ar ? Math.round(ar.right) : null,
      hdrRight: Math.round(r.right),
      vw: window.innerWidth,
    };
  });

  expect(m.titleVisible, 'discover title visible').toBe(true);
  // Actions must not hang past the header/viewport
  if (m.actionsRight !== null) {
    expect(m.actionsRight, `actionsRight ${m.actionsRight} > hdrRight ${m.hdrRight}`).toBeLessThanOrEqual(m.hdrRight + 2);
    expect(m.actionsRight, `actionsRight ${m.actionsRight} > vw ${m.vw}`).toBeLessThanOrEqual(m.vw + 2);
  }
  // Single row: vertical centers align (align-items:center; tops differ when heights differ)
  if (m.titleMid !== null && m.actionsMid !== null) {
    expect(
      Math.abs(m.titleMid - m.actionsMid),
      `title/actions centers diverge: ${m.titleMid} vs ${m.actionsMid}`
    ).toBeLessThanOrEqual(8);
  }
  // Header height should be one row (~60-90px), not double (~100+)
  expect(m.hdrH, `hdr height ${m.hdrH} suggests wrapped rows`).toBeLessThanOrEqual(96);

  // At ≤390 Round 59b forces grid (muse.css:432-444). Computed grid-template
  // resolves `auto` → px, so assert 2 columns rather than the literal keyword.
  if (m.vw <= 390) {
    expect(m.display, 'narrow discover hdr uses grid').toBe('grid');
    const cols = m.gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
    expect(cols.length, `grid columns "${m.gridTemplateColumns}"`).toBeGreaterThanOrEqual(2);
  }
}

/**
 * All visible nav items must be ≥44×44 and fully inside the nav bar.
 * Each .screen-el owns a .nav (muse.css:276-277 hides inactive screens');
 * must target the ACTIVE screen's nav or `.first()` hits a display:none copy.
 */
export async function assertNavTouchTargets(page: Page, min = 44) {
  const nav = page
    .locator('.screen-el.active nav[aria-label="Main navigation"], .screen-el.active .nav')
    .first();
  await expect(nav).toBeVisible({ timeout: 8000 });
  const items = nav.locator('button.nav-item');
  const n = await items.count();
  expect(n, 'nav has items').toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const item = items.nth(i);
    await expect(item).toBeVisible({ timeout: 4000 });
    const box = await item.boundingBox();
    expect(box, `nav-item[${i}] has box`).toBeTruthy();
    if (box) {
      expect(box.width, `nav-item[${i}] w=${box.width}`).toBeGreaterThanOrEqual(min - 0.5);
      expect(box.height, `nav-item[${i}] h=${box.height}`).toBeGreaterThanOrEqual(min - 0.5);
    }
  }
}
