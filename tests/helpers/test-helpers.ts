import { Page, Locator, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function waitForSplashScreen(page: Page) {
  await page.waitForSelector('#splash-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});
}

export async function checkAccessibility(page: Page, options?: { excludedRules?: string[] }) {
  const axeBuilder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']);
  
  if (options?.excludedRules) {
    for (const rule of options.excludedRules) {
      axeBuilder.disableRules(rule);
    }
  }

  const results = await axeBuilder.analyze();
  expect(results.violations).toEqual([]);
  return results;
}

export async function checkTouchTargets(page: Page, minSize = 44) {
  const interactiveElements = await page.locator('button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])').all();
  
  const violations: string[] = [];
  
  for (const element of interactiveElements) {
    const box = await element.boundingBox();
    if (box && (box.width < minSize || box.height < minSize)) {
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      const className = await element.getAttribute('class') || '';
      const ariaLabel = await element.getAttribute('aria-label') || '';
      const text = await element.textContent() || '';
      violations.push(
        `${tagName}.${className} (${ariaLabel || text.substring(0, 30)}) = ${Math.round(box.width)}x${Math.round(box.height)}px`
      );
    }
  }
  
  if (violations.length > 0) {
    console.warn(`Touch target violations (${minSize}px minimum):`, violations);
  }
  
  expect(violations.length).toBe(0);
}

export async function waitForAnimationFrame(page: Page, count = 2) {
  for (let i = 0; i < count; i++) {
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
}

export async function checkNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const body = document.body;
    return body.scrollWidth > body.clientWidth;
  });
  
  expect(overflow).toBe(false);
}

export async function checkSkipLink(page: Page) {
  const skipLink = page.locator('a[href="#main-content"], a.skip-link, a[href="#main"]');
  await expect(skipLink.first()).toBeVisible();
  
  await skipLink.first().focus();
  await expect(skipLink.first()).toBeFocused();
}

export async function checkModalFocusTrap(page: Page, modalSelector: string) {
  const modal = page.locator(modalSelector);
  await expect(modal).toBeVisible();
  
  const focusableElements = await modal.locator(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ).all();
  
  if (focusableElements.length > 0) {
    await focusableElements[0].focus();
    await expect(focusableElements[0]).toBeFocused();
    
    for (let i = 0; i < focusableElements.length + 2; i++) {
      await page.keyboard.press('Tab');
    }
    
    await expect(focusableElements[0]).toBeFocused();
  }
}

export async function checkPageTour(page: Page, tourId: string) {
  const tour = page.locator(`[data-tour="${tourId}"], [data-page-tour="${tourId}"]`);
  await expect(tour).toBeVisible();
  
  const closeBtn = tour.locator('button[aria-label="Close"], button[aria-label="Skip"], [data-tour-close]');
  await expect(closeBtn).toBeVisible();
  
  const touchTarget = await closeBtn.boundingBox();
  if (touchTarget) {
    expect(touchTarget.width).toBeGreaterThanOrEqual(44);
    expect(touchTarget.height).toBeGreaterThanOrEqual(44);
  }
}

export async function checkDiscoverQueueIsolation(page: Page) {
  // Real DiscoverScreen hooks: queued depth cards are `.swipe-card` children of
  // `.card-stack` that are NOT the top card, and carry `aria-hidden` + `inert` +
  // `pointer-events:none` (DiscoverScreen.tsx ~L394). The previous locator
  // (`[data-queued="true"], [aria-hidden="true"][data-card-index]`) matched
  // nothing — DiscoverScreen exposes only `data-screen` — so the loop body never
  // ran and this helper passed VACUOUSLY. It now fails if no queued card exists.
  const queuedCards = page.locator('.card-stack .swipe-card[inert][aria-hidden="true"]');
  const count = await queuedCards.count();
  expect(count, 'expected at least one queued (non-top) discover card').toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const card = queuedCards.nth(i);
    await expect(card).toHaveAttribute('aria-hidden', 'true');
    await expect(card).toHaveAttribute('inert', '');
    await expect(card).toHaveCSS('pointer-events', 'none');
  }
}

export async function loginAsDemoUser(page: Page, opts?: { seedTours?: boolean; screen?: string }) {
  // Screen starts as "auth" with no auto demo login. Seed muse_v1 (not muse_user)
  // so loadState() restores authUser + screen without applySession()
  // token validation (a fake muse_user would bounce back to auth on 401).
  // seedTours defaults true: first-visit page tours + verify banner + daily-login
  // modal would otherwise intercept Collab badge / width / feed assertions.
  // screen defaults to discover; pass 'connections' for Feed tests so async
  // loadState restores INTO the feed (a late restore to 'discover' can bounce
  // a post-login nav click).
  const seedTours = opts?.seedTours !== false;
  const startScreen = opts?.screen ?? 'discover';
  await page.addInitScript(({ withTours, screen }: { withTours: boolean; screen: string }) => {
    try {
      localStorage.setItem('muse_v1', JSON.stringify({
        v: 2,
        authUser: {
          id: 'demo-e2e-user',
          email: 'demo-e2e@example.com',
          profile: { id: 'demo-e2e-profile', name: 'Demo User' },
        },
        screen,
        currentUser: {
          id: 'you',
          name: 'Demo User',
          type: 'Photographer',
          audience: 'creative',
        },
      }));
      // Verification banner (page.tsx L428) — seeded so it never overlays nav.
      localStorage.setItem('muse_verify_banner_dismissed', '1');
      if (withTours) {
        // ALL_TOUR_IDS from pageTourContent.tsx — 11 destinations + forum tab.
        const tourIds = [
          'discover', 'connections', 'briefs', 'matches', 'bts',
          'chat', 'community', 'sessions', 'forum', 'network', 'studios',
        ];
        for (const id of tourIds) {
          localStorage.setItem(`muse_tour_seen_${id}`, '1');
        }
      }
      // Daily-login / streak overlay (page.tsx L1719) fires only when
      // muse_quest_login_day !== today. Pre-seed today so it never opens.
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('muse_quest_login_day', today);
      try {
        const days = JSON.parse(localStorage.getItem('muse_login_days') || '[]');
        if (!days.includes(today)) days.push(today);
        localStorage.setItem('muse_login_days', JSON.stringify(days.slice(-7)));
      } catch { /* ignore malformed history */ }
    } catch {
      /* storage may be unavailable in some contexts */
    }
  }, { withTours: seedTours, screen: startScreen });
  // Root `/` is a custom 404 locally (Vercel redirect only applies in prod).
  // waitUntil domcontentloaded: full `load` hangs under Next dev HMR +
  // remote image preloads (same pattern as tests/smoke.spec.ts).
  await page.goto('/muse', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#splash-screen', { state: 'hidden', timeout: 15000 }).catch(() => {});
  await page.waitForSelector('[data-screen="discover"], .discover-screen', { timeout: 15000 }).catch(() => {});
}

/** Dismiss any open first-visit page tour overlay (idempotent, short timeout). */
export async function dismissPageTour(page: Page) {
  const close = page.locator('.tour-overlay button[aria-label="Close tutorial"], .tour-overlay .tour-close').first();
  if (await close.isVisible({ timeout: 400 }).catch(() => false)) {
    await close.click({ timeout: 3000 }).catch(() => {});
    await page.waitForSelector('.tour-overlay', { state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

/** Assert documentElement/body do not scroll horizontally at the current viewport. */
export async function assertNoDocOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return doc.scrollWidth > doc.clientWidth || body.scrollWidth > body.clientWidth;
  });
  expect(overflow).toBe(false);
}

// proxy.ts origin-gates every non-GET /api/* call. ALLOWED_ORIGINS always
// includes PROD_ORIGIN (https://muse.wyzdesign.com); localhost is only
// allowed when NEXT_PUBLIC_APP_URL is set. Send PROD_ORIGIN so the demo-gate
// assertion is reachable in CI and local runs without weakening the proxy.
const ALLOWED_TEST_ORIGIN = 'https://muse.wyzdesign.com';

export async function checkDemoModeMutationDenial(page: Page, action: string) {
  const response = await page.request.post('/api/muse', {
    data: { action },
    failOnStatusCode: false,
    headers: {
      Origin: ALLOWED_TEST_ORIGIN,
      Referer: `${ALLOWED_TEST_ORIGIN}/muse`,
    },
  });

  expect(response.status()).toBe(409);

  const body = await response.json();
  expect(body.code).toBe('DEMO_MODE');
  expect(body.error).toMatch(/unavailable in demo mode/i);
  expect(body.error).not.toMatch(/\/(home|Users|home\/|[A-Za-z]:\\)/i);
  expect(body.error).not.toMatch(/stack|trace|internal|exception|\/src\/|node_modules/i);
}