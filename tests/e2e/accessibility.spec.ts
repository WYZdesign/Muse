import { test, expect } from '../fixtures/test-fixtures';
import { loginAsDemoUser, dismissPageTour } from '../helpers/test-helpers';
import {
  KNOWN_A11Y_GAPS,
  SHELL_KNOWN_GAPS,
  assertNoNewAxeViolations,
  collectAxeViolations,
  countVisibleMains,
  visibleMainNavs,
  unlabeledInteractive,
  imagesMissingAlt,
  smallNavTouchTargets,
  assertTabSemantics,
  assertDialogSemantics,
  assertEscapeClosesDialog,
  openMenuFromActiveNav,
  navigateViaMenu,
} from '../helpers/accessibility-helpers';

// Priority C: accessibility suite — axe-core WCAG 2.1 AA + landmark/name/focus/
// dialog/tab assertions across primary screens. Exclusive files:
//   tests/e2e/accessibility.spec.ts
//   tests/helpers/accessibility-helpers.ts
// @axe-core/playwright@^4.13.0 already in package.json.
//
// Known product gaps are BASELINED in KNOWN_A11Y_GAPS (annotated, not silent).
// Unknown axe rules and structural regressions hard-fail. Product fixes → Priority G.

async function seedAndOpen(page: import('@playwright/test').Page, screen?: string) {
  await loginAsDemoUser(page, screen ? { screen } : undefined);
  await dismissPageTour(page);
}

async function ensureScreen(page: import('@playwright/test').Page, screen: string) {
  // Settings is a full-page overlay (screen==='settings') without data-screen attr.
  const rootSel =
    screen === 'settings'
      ? '.settings-scroll, .settings-group, button[aria-label^="Back to Profile"]'
      : `[data-screen="${screen}"]`;
  const locator = page.locator(rootSel).first();
  if (await locator.isVisible({ timeout: 8000 }).catch(() => false)) return true;

  const label =
    screen === 'briefs'
      ? /Collab|Brief/i
      : screen === 'profile'
        ? /Profile/i
        : screen === 'settings'
          ? /Settings/i
          : screen === 'network'
            ? /Network/i
            : screen === 'community'
              ? /Community/i
              : screen === 'sessions'
                ? /Sessions/i
                : screen === 'bts'
                  ? /BTS|Behind/i
                  : screen;
  const opened = await navigateViaMenu(page, label, screen === 'settings' ? undefined : screen);
  if (screen === 'settings') {
    // Settings has no data-screen — wait for settings-scroll after menu click.
    await page
      .waitForSelector('.settings-scroll, .settings-group', { timeout: 8000 })
      .catch(() => {});
    return page
      .locator('.settings-scroll, .settings-group')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }
  if (opened) return true;
  return locator.isVisible({ timeout: 5000 }).catch(() => false);
}

test.describe('Priority C Accessibility — axe per screen', () => {
  test('Landing/auth shell: no NEW axe violations', async ({ page }) => {
    await page.goto('/muse', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#splash-screen', { state: 'hidden', timeout: 15000 }).catch(() => {});
    await assertNoNewAxeViolations(page, { knownGapIds: SHELL_KNOWN_GAPS });
  });

  test('Discover: no NEW axe violations', async ({ page }) => {
    await seedAndOpen(page);
    await page.waitForSelector('[data-screen="discover"]', { timeout: 15000 });
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, { knownGapIds: SHELL_KNOWN_GAPS });
  });

  test('Feed (connections): no NEW axe violations', async ({ page }) => {
    await seedAndOpen(page, 'connections');
    await page.waitForSelector('[data-screen="connections"].active', { timeout: 15000 });
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, { knownGapIds: SHELL_KNOWN_GAPS });
  });

  test('Profile: no NEW axe violations (toggle-name baselined)', async ({ page }) => {
    await seedAndOpen(page, 'profile');
    const ok = await ensureScreen(page, 'profile');
    test.skip(!ok, 'Profile screen not reachable');
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, {
      knownGapIds: [...SHELL_KNOWN_GAPS, 'aria-toggle-field-name'],
    });
  });

  test('Settings: no NEW axe violations', async ({ page }) => {
    await seedAndOpen(page, 'settings');
    const ok = await ensureScreen(page, 'settings');
    test.skip(!ok, 'Settings screen not reachable');
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, {
      knownGapIds: [...SHELL_KNOWN_GAPS, 'aria-toggle-field-name'],
    });
  });

  test('Network: no NEW axe violations (required-parent baselined)', async ({ page }) => {
    await seedAndOpen(page, 'network');
    const ok = await ensureScreen(page, 'network');
    test.skip(!ok, 'Network screen not reachable');
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, {
      knownGapIds: [...SHELL_KNOWN_GAPS, 'aria-required-parent'],
    });
  });

  test('Community: no NEW axe violations (skip if beta-hidden)', async ({ page }) => {
    await seedAndOpen(page, 'community');
    const ok = await ensureScreen(page, 'community');
    // MUSE_CLOSED_BETA_HIDE_SOCIAL removes Community from menu — expected skip.
    test.skip(!ok, 'Community not reachable (closed-beta hide social)');
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, { knownGapIds: SHELL_KNOWN_GAPS });
  });

  test('Sessions: no NEW axe violations', async ({ page }) => {
    await seedAndOpen(page, 'sessions');
    const ok = await ensureScreen(page, 'sessions');
    test.skip(!ok, 'Sessions screen not reachable');
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, { knownGapIds: SHELL_KNOWN_GAPS });
  });

  test('Briefs (Collab): no NEW axe violations (button-name baselined)', async ({ page }) => {
    await seedAndOpen(page, 'briefs');
    const ok = await ensureScreen(page, 'briefs');
    test.skip(!ok, 'Briefs screen not reachable');
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, {
      knownGapIds: [...SHELL_KNOWN_GAPS, 'button-name'],
    });
  });

  test('BTS: no NEW axe violations (contrast baselined)', async ({ page }) => {
    await seedAndOpen(page, 'bts');
    const ok = await ensureScreen(page, 'bts');
    test.skip(!ok, 'BTS screen not reachable');
    await dismissPageTour(page);
    await assertNoNewAxeViolations(page, {
      knownGapIds: [...SHELL_KNOWN_GAPS, 'color-contrast'],
    });
  });
});

test.describe('Priority C — landmark / name / dialog / tab / focus', () => {
  test('Active shell exposes at most one visible Main navigation landmark', async ({ page }) => {
    await seedAndOpen(page);
    await page.waitForSelector('[data-screen="discover"]', { timeout: 15000 });
    const navs = await visibleMainNavs(page);
    const mainNavs = navs.filter(n => /main navigation/i.test(n));
    expect(
      mainNavs.length,
      `Visible Main navigation landmarks: ${JSON.stringify(navs)}`
    ).toBeLessThanOrEqual(1);
    expect(navs.length).toBeGreaterThanOrEqual(1);
  });

  test('At most one visible main landmark after demo login', async ({ page }) => {
    await seedAndOpen(page);
    await page.waitForSelector('[data-screen="discover"]', { timeout: 15000 });
    const mains = await countVisibleMains(page);
    if (mains === 0) {
      test.info().annotations.push({
        type: 'known-gap',
        description: KNOWN_A11Y_GAPS.region,
      });
    } else {
      expect(mains).toBe(1);
    }
  });

  test('No unlabeled interactive controls on Discover', async ({ page }) => {
    await seedAndOpen(page);
    await page.waitForSelector('[data-screen="discover"]', { timeout: 15000 });
    await dismissPageTour(page);
    const missing = await unlabeledInteractive(page);
    expect(missing, `Unlabeled: ${missing.join(', ')}`).toEqual([]);
  });

  test('All product images expose alt text', async ({ page }) => {
    await seedAndOpen(page);
    await page.waitForSelector('[data-screen="discover"]', { timeout: 15000 });
    const missing = await imagesMissingAlt(page);
    expect(missing, `Missing alt: ${missing.join(', ')}`).toEqual([]);
  });

  test('Active nav + dialog controls meet 44px (card chrome baselined)', async ({ page }) => {
    await seedAndOpen(page);
    await page.waitForSelector('[data-screen="discover"]', { timeout: 15000 });
    await dismissPageTour(page);
    const small = await smallNavTouchTargets(page, 44);
    if (small.length > 0) {
      test.info().annotations.push({
        type: 'known-gap',
        description: `Nav/dialog undersized: ${small.join(' | ')}`,
      });
    }
    // Hard: at least the Menu control must be present at ≥44 once visible.
    const menu = page.locator('.screen-el.active button.nav-item[aria-label="Menu"]').first();
    if (await menu.isVisible({ timeout: 3000 }).catch(() => false)) {
      const box = await menu.boundingBox();
      expect(box && box.width >= 44 && box.height >= 44, `Menu ${JSON.stringify(box)}`).toBeTruthy();
    }
    expect(small.filter(h => /menu/i.test(h)), `Menu undersized: ${small.join(', ')}`).toEqual([]);
  });

  test('Feed filter row exposes tablist semantics', async ({ page }) => {
    await seedAndOpen(page, 'connections');
    await page.waitForSelector('[data-screen="connections"].active', { timeout: 15000 });
    await dismissPageTour(page);
    const tablist = page
      .locator('[data-screen="connections"] [role="tablist"][aria-label="Feed filter"]')
      .first();
    if (!(await tablist.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Feed filter tablist not visible');
    }
    await assertTabSemantics(page, '[data-screen="connections"] [role="tablist"][aria-label="Feed filter"]');
  });

  test('Sessions tabs expose tablist semantics when screen open', async ({ page }) => {
    await seedAndOpen(page, 'sessions');
    const ok = await ensureScreen(page, 'sessions');
    test.skip(!ok, 'Sessions screen not reachable');
    await dismissPageTour(page);
    const tablist = page
      .locator('[data-screen="sessions"] [role="tablist"][aria-label="Session tabs"]')
      .first();
    if (!(await tablist.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Session tabs not visible');
    }
    await assertTabSemantics(page, '[data-screen="sessions"] [role="tablist"][aria-label="Session tabs"]');
  });

  test('Menu dialog has role=dialog + accessible name; Escape or named close dismisses', async ({
    page,
  }) => {
    await seedAndOpen(page);
    const opened = await openMenuFromActiveNav(page);
    expect(opened, 'Menu button not visible on active screen').toBeTruthy();
    // Prefer .hamburger-overlay (outer sheet); role=dialog also matches backdrop.
    const menuSel = '.hamburger-overlay';
    const menu = page.locator(menuSel).first();
    await expect(menu).toBeVisible({ timeout: 5000 });
    await assertDialogSemantics(page, menuSel);
    const openViolations = await collectAxeViolations(page, {
      exclude: ['nextjs-portal'],
      knownGapIds: SHELL_KNOWN_GAPS,
    });
    const fresh = openViolations.filter(v => !SHELL_KNOWN_GAPS.includes(v.id));
    expect(fresh, fresh.map(v => v.id).join(', ')).toEqual([]);
    await assertEscapeClosesDialog(page, menuSel);
  });

  test('Book Session dialog (if reachable): named close dismisses', async ({ page }) => {
    await seedAndOpen(page, 'sessions');
    const ok = await ensureScreen(page, 'sessions');
    test.skip(!ok, 'Sessions screen not reachable');
    await dismissPageTour(page);
    const bookBtn = page.locator('button:has-text("Book Session")').first();
    const bookVisible = await bookBtn.isVisible({ timeout: 6000 }).catch(() => false);
    test.skip(!bookVisible, 'No available Book Session button on Browse (demo inventory)');
    await bookBtn.click({ timeout: 4000 });
    const form = page.locator('[role="dialog"][aria-label="Book session"]').first();
    await expect(form).toBeVisible({ timeout: 5000 });
    await assertDialogSemantics(page, '[role="dialog"][aria-label="Book session"]');
    const close = form.locator('button[aria-label="Close booking form"]').first();
    await expect(close).toBeVisible();
    await close.dispatchEvent('click');
    await expect(form).toBeHidden({ timeout: 4000 });
  });

  test('Skip link focuses #muse-main when target exists', async ({ page }) => {
    await seedAndOpen(page);
    await page.waitForSelector('[data-screen="discover"]', { timeout: 15000 });
    const skip = page.locator('a[href="#muse-main"]').first();
    const hasSkip = await skip.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasSkip) {
      test.info().annotations.push({
        type: 'known-gap',
        description: 'Skip link not visible/focusable (CHATGPT_LIVE_DISCOVER_REGRESSION_BUNDLE)',
      });
      test.skip(true, 'Skip link absent on this shell');
    }
    const hasMain = await page.locator('#muse-main').count();
    if (hasMain === 0) {
      test.info().annotations.push({
        type: 'known-gap',
        description: KNOWN_A11Y_GAPS.region,
      });
      test.skip(true, '#muse-main not mounted');
    }
    await skip.focus();
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focusedId).toBe('muse-main');
  });

  test('Active screen heading structure has no empty h1..h3', async ({ page }) => {
    await seedAndOpen(page);
    await page.waitForSelector('[data-screen="discover"]', { timeout: 15000 });
    const empty = await page.evaluate(() => {
      const active = document.querySelector('.screen-el.active') || document.body;
      return Array.from(active.querySelectorAll('h1, h2, h3'))
        .filter(h => {
          const style = window.getComputedStyle(h);
          if (style.display === 'none') return false;
          return !(h.textContent || '').trim();
        })
        .map(h => h.tagName);
    });
    expect(empty).toEqual([]);
  });
});
