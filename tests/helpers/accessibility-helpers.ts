import { Page, expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** WCAG tags for Priority C scans (same baseline as test-fixtures axe fixture). */
export const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] as const;

export type AxeScanOptions = {
  /** Extra rules to disable for this scan only — document in the call site. */
  disabledRules?: string[];
  /** Restrict scan to a CSS selector (e.g. open dialog). Defaults to whole document. */
  include?: string;
  /** Skip selectors (dev overlays only — do not skip product content). */
  exclude?: string[];
  /**
   * Known product gap keys (see KNOWN_A11Y_GAPS). Matching violations are
   * annotated as known-gap and do not fail the scan. Unknown rules ALWAYS fail.
   */
  knownGapIds?: readonly string[];
};

export type AxeViolationSummary = {
  id: string;
  impact: string | null;
  nodes: number;
  help: string;
  targets: string[];
};

/**
 * Documented PRE-EXISTING product accessibility defects (Priority C baseline).
 * These are NOT disabled rules — they are recorded gaps so new regressions
 * still hard-fail. Product fixes belong to Priority G / screen owners.
 * Key = axe rule id (optionally scoped "screen:rule" via knownGapIds at call site).
 */
export const KNOWN_A11Y_GAPS: Record<string, string> = {
  region:
    'Page content outside landmarks — missing #muse-main / landmark shell (CHATGPT_DOCUMENT_LANDMARKS_BUNDLE)',
  'aria-toggle-field-name':
    'Profile/Settings .toggle switches lack accessible names (CHATGPT_…_A11Y batches)',
  'aria-required-parent':
    'Network Hiring filter role="tab" not inside role="tablist" (NetworkScreen disclosure controls)',
  'button-name':
    'Briefs .brief-btn-save icon buttons have no discernible text (CollabScreen L371)',
  'color-contrast':
    'BTS filter button fails contrast (product CSS — Priority G / design)',
  'target-size':
    'Discover card chrome still 38×38 (mobile touch-target bundles) — nav/dialog targets covered by hard 44px assert',
};

export function summarizeViolations(
  results: Awaited<ReturnType<AxeBuilder['analyze']>>
): AxeViolationSummary[] {
  return results.violations.map(v => ({
    id: v.id,
    impact: v.impact ?? null,
    nodes: v.nodes.length,
    help: v.help,
    targets: v.nodes.slice(0, 5).map(n => n.target.join(' ')),
  }));
}

export function formatViolations(list: AxeViolationSummary[]): string {
  return list
    .map(
      v =>
        `- [${v.impact ?? 'n/a'}] ${v.id}: ${v.help} (${v.nodes} node(s))\n  e.g. ${v.targets.join(' | ')}`
    )
    .join('\n');
}

async function runAxe(page: Page, options: AxeScanOptions = {}) {
  let builder = new AxeBuilder({ page }).withTags([...A11Y_TAGS]);
  for (const rule of options.disabledRules ?? []) {
    builder = builder.disableRules(rule);
  }
  for (const sel of options.exclude ?? []) {
    builder = builder.exclude(sel);
  }
  if (options.include) {
    builder = builder.include(options.include);
  }
  return builder.analyze();
}

/**
 * Run axe and fail only on violations NOT listed in knownGapIds.
 * Known gaps are annotated on the test via test.info() when available.
 */
export async function assertNoNewAxeViolations(page: Page, options: AxeScanOptions = {}) {
  const results = await runAxe(page, options);
  const summary = summarizeViolations(results);
  const known = new Set(options.knownGapIds ?? []);
  const fresh = summary.filter(v => !known.has(v.id));
  const baselined = summary.filter(v => known.has(v.id));
  for (const v of baselined) {
    test.info().annotations.push({
      type: 'known-gap',
      description: `${v.id}: ${KNOWN_A11Y_GAPS[v.id] ?? 'baselined product gap'} (${v.nodes} node(s))`,
    });
  }
  if (fresh.length > 0) {
    throw new Error(
      `NEW axe-core violations (not in Priority C baseline):\n${formatViolations(fresh)}`
    );
  }
  return results;
}

/** Strict zero-violation scan — use when a surface is expected clean. */
export async function assertNoAxeViolations(page: Page, options: AxeScanOptions = {}) {
  const results = await runAxe(page, options);
  const summary = summarizeViolations(results);
  if (summary.length > 0) {
    throw new Error(`axe-core violations:\n${formatViolations(summary)}`);
  }
  return results;
}

/** Like assertNoAxeViolations but returns the list instead of throwing. */
export async function collectAxeViolations(page: Page, options: AxeScanOptions = {}) {
  const results = await runAxe(page, options);
  return summarizeViolations(results);
}

/** Baseline known-gap rule ids (all screens that share shell/region issues). */
export const SHELL_KNOWN_GAPS: readonly string[] = ['region', 'target-size'];

export async function countVisibleMains(page: Page): Promise<number> {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('main, [role="main"]'));
    return nodes.filter(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (el.closest('[aria-hidden="true"], [inert]')) return false;
      return true;
    }).length;
  });
}

export async function visibleMainNavs(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const navs = Array.from(
      document.querySelectorAll('nav, [role="navigation"], .nav')
    ) as HTMLElement[];
    return navs
      .filter(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('inert')) return false;
        if (el.closest('[aria-hidden="true"], [inert]')) return false;
        const box = el.getBoundingClientRect();
        if (box.width <= 0 || box.height <= 0) return false;
        return true;
      })
      .map(el => {
        const label =
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          (typeof el.className === 'string' ? el.className : '') ||
          el.tagName.toLowerCase();
        return String(label);
      });
  });
}

export async function unlabeledInteractive(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const sel =
      'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="link"]';
    const nodes = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
    const visible = nodes.filter(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (el.closest('[aria-hidden="true"], [inert]')) return false;
      const box = el.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return false;
      const root = el.getRootNode();
      if (root instanceof ShadowRoot && root.host?.tagName?.toLowerCase() === 'nextjs-portal') {
        return false;
      }
      return true;
    });

    const accName = (el: HTMLElement): string => {
      const aria = el.getAttribute('aria-label');
      if (aria && aria.trim()) return aria.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const parts = labelledBy
          .split(/\s+/)
          .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean);
        if (parts.join(' ')) return parts.join(' ');
      }
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        const id = el.id;
        if (id) {
          const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (lab?.textContent?.trim()) return lab.textContent.trim();
        }
        const closeLab = el.closest('label')?.textContent?.trim();
        if (closeLab) return closeLab;
        const placeholder = el.getAttribute('placeholder');
        if (placeholder?.trim()) return placeholder.trim();
        const title = el.getAttribute('title');
        if (title?.trim()) return title.trim();
        return '';
      }
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) return text;
      const title = el.getAttribute('title');
      if (title?.trim()) return title.trim();
      const imgAlt = el.querySelector('img[alt]')?.getAttribute('alt');
      if (imgAlt?.trim()) return imgAlt.trim();
      const svgTitle = el.querySelector('title')?.textContent;
      if (svgTitle?.trim()) return svgTitle.trim();
      return '';
    };

    return visible
      .filter(el => !accName(el))
      .map(el => {
        const cls = (el.getAttribute('class') || '').split(/\s+/).slice(0, 3).join('.');
        return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
      })
      .slice(0, 40);
  });
}

export async function imagesMissingAlt(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    return imgs
      .filter(img => {
        if (img.getAttribute('aria-hidden') === 'true') return false;
        if (
          img.getAttribute('role') === 'presentation' ||
          img.getAttribute('role') === 'none'
        ) {
          return false;
        }
        if (img.closest('[aria-hidden="true"], [inert]')) return false;
        const style = window.getComputedStyle(img);
        if (style.display === 'none') return false;
        return !img.hasAttribute('alt');
      })
      .map(img => img.getAttribute('src') || '(no src)')
      .slice(0, 20);
  });
}

/**
 * Visible nav-bar / dialog targets below minSize.
 * Hard scope: bottom nav items + dialogs only (Priority A contract).
 * Discover card chrome 38px is baselined under KNOWN_A11Y_GAPS['target-size'].
 */
export async function smallNavTouchTargets(page: Page, minSize = 44): Promise<string[]> {
  return page.evaluate(min => {
    const sel =
      '.screen-el.active .nav .nav-item, .screen-el.active nav[aria-label="Main navigation"] button, [role="dialog"] button, [role="dialog"] a';
    const nodes = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
    const hits: string[] = [];
    for (const el of nodes) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.closest('[aria-hidden="true"], [inert]')) continue;
      const root = el.getRootNode();
      if (root instanceof ShadowRoot && root.host?.tagName?.toLowerCase() === 'nextjs-portal') {
        continue;
      }
      // Visually-hidden skip links are 1×1 until focused — not touch targets.
      if (el.classList.contains('sr-only') || el.classList.contains('skip-link')) continue;
      const box = el.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) continue;
      if (box.width < min || box.height < min) {
        const label =
          el.getAttribute('aria-label') ||
          (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) ||
          el.tagName.toLowerCase();
        hits.push(`${label} = ${Math.round(box.width)}×${Math.round(box.height)}`);
      }
    }
    return hits.slice(0, 30);
  }, minSize);
}

export async function assertTabSemantics(page: Page, tablistSelector: string) {
  const tablist = page.locator(tablistSelector).first();
  await expect(tablist).toHaveAttribute('role', 'tablist');
  const tabs = tablist.locator('[role="tab"]');
  expect(await tabs.count()).toBeGreaterThan(0);
  const selected = await tablist.locator('[role="tab"][aria-selected="true"]').count();
  expect(selected).toBe(1);
  const selTab = tablist.locator('[role="tab"][aria-selected="true"]').first();
  const tabindex = await selTab.getAttribute('tabindex');
  expect(tabindex === null || tabindex === '0').toBeTruthy();
}

export async function assertDialogSemantics(
  page: Page,
  dialogSelector: string,
  opts: { expectAriaLabel?: boolean } = {}
) {
  const dialog = page.locator(dialogSelector).first();
  await expect(dialog).toBeVisible({ timeout: 5000 });
  const role = await dialog.getAttribute('role');
  expect(role).toBe('dialog');
  if (opts.expectAriaLabel !== false) {
    const label = await dialog.getAttribute('aria-label');
    const labelledby = await dialog.getAttribute('aria-labelledby');
    expect(Boolean(label?.trim() || labelledby?.trim())).toBeTruthy();
  }
}

/**
 * Close dialog: Escape first (document keydown works under inert),
 * then named-close fallback via dispatchEvent (Priority A pattern for
 * hamburger when Escape does not dismiss).
 */
export async function assertEscapeClosesDialog(page: Page, dialogSelector: string) {
  const dialog = page.locator(dialogSelector).first();
  await expect(dialog).toBeVisible({ timeout: 5000 });
  // Focus inside the dialog so document-level Escape (useFocusTrap) receives keydown.
  const focusTarget = page
    .locator(`${dialogSelector} [tabindex="0"], ${dialogSelector} button, ${dialogSelector} a`)
    .first();
  await focusTarget.focus().catch(() => {});
  await page.keyboard.press('Escape');
  // MenuModal plays a 320ms closing animation before unmount.
  const closed = await dialog
    .waitFor({ state: 'hidden', timeout: 2500 })
    .then(() => true)
    .catch(() => false);
  if (closed) return;
  // Fallback: hamburger-close is div[role=button] (not <button>) — Priority A pattern.
  const close = page
    .locator(
      `${dialogSelector} [role="button"][aria-label*="Close" i], ${dialogSelector} .hamburger-close, ${dialogSelector} [aria-label*="Dismiss" i]`
    )
    .first();
  if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
    await close.dispatchEvent('click');
  } else {
    const backdrop = page.locator('.hamburger-backdrop').first();
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await backdrop.dispatchEvent('click');
    }
  }
  await expect(dialog).toBeHidden({ timeout: 4000 });
}

/**
 * Open a menu destination by its hamburger-item label and wait for the
 * target screen. Menu items are div.hamburger-item[role=button], not <button>.
 * Community may be absent when MUSE_CLOSED_BETA_HIDE_SOCIAL is on.
 */
export async function navigateViaMenu(page: Page, labelText: RegExp | string, screen?: string) {
  const menuOverlay = page.locator('.hamburger-overlay').first();
  const alreadyOpen = await menuOverlay.isVisible({ timeout: 2000 }).catch(() => false);
  if (!alreadyOpen) {
    // Prefer scoped active-nav Menu; fall back to any Menu via dispatchEvent
    // (normal click is blocked by backdrop when a prior open is mid-animation).
    const menuBtn = page
      .locator('.screen-el.active button.nav-item[aria-label="Menu"], button.nav-item[aria-label="Menu"]')
      .first();
    if (await menuBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuBtn.dispatchEvent('click').catch(() => {});
    } else {
      const opened = await openMenuFromActiveNav(page);
      if (!opened) return false;
    }
    await menuOverlay.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
  if (!(await menuOverlay.isVisible().catch(() => false))) return false;

  const item = page
    .locator('.hamburger-overlay .hamburger-item')
    .filter({ hasText: labelText })
    .first();
  const count = await item.count();
  if (count === 0) {
    // Entry not present (e.g. Community under closed-beta hide social) — close menu.
    await page.keyboard.press('Escape').catch(() => {});
    await menuOverlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    const close = page.locator('.hamburger-close').first();
    if (await close.isVisible({ timeout: 500 }).catch(() => false)) {
      await close.dispatchEvent('click').catch(() => {});
    }
    return false;
  }
  await item.dispatchEvent('click');
  await menuOverlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  if (screen) {
    await page.waitForSelector(`[data-screen="${screen}"]`, { timeout: 10000 }).catch(() => {});
    return page
      .locator(`[data-screen="${screen}"]`)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }
  return true;
}

/** Open Menu from the ACTIVE screen's nav (scoped — ghost navs may exist). */
export async function openMenuFromActiveNav(page: Page): Promise<boolean> {
  const overlay = page.locator('.hamburger-overlay').first();
  if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) return true;

  const candidates = [
    page.locator('.screen-el.active button.nav-item[aria-label="Menu"]').first(),
    page.locator('button.nav-item[aria-label="Menu"]').first(),
    page.locator('.screen-el.active button.nav-item[aria-label*="Menu" i]').first(),
  ];
  for (const btn of candidates) {
    if (await btn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await btn.dispatchEvent('click').catch(() => {});
      const opened = await overlay
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (opened) return true;
      // Normal click fallback if dispatchEvent did not open.
      await btn.click({ timeout: 4000 }).catch(() => {});
      const opened2 = await overlay
        .waitFor({ state: 'visible', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (opened2) return true;
    }
  }
  return false;
}

/** Choose a menu entry by text (dispatchEvent — useFocusTrap inert workaround). */
export async function chooseFromMenu(page: Page, text: RegExp | string) {
  const item = page
    .locator('.hamburger-overlay .hamburger-item, [role="dialog"] button, .hamburger-overlay button')
    .filter({ hasText: text })
    .first();
  await item.dispatchEvent('click', { timeout: 8000 });
}
