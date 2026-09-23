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
  const queuedCards = page.locator('[data-queued="true"], [aria-hidden="true"][data-card-index]');
  const count = await queuedCards.count();
  
  for (let i = 0; i < count; i++) {
    const card = queuedCards.nth(i);
    await expect(card).toHaveAttribute('aria-hidden', 'true');
    await expect(card).toHaveAttribute('inert', '');
    await expect(card).toHaveCSS('pointer-events', 'none');
  }
}

export async function loginAsDemoUser(page: Page) {
  await page.goto('/');
  await page.waitForSelector('#splash-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.waitForSelector('[data-screen="discover"], .discover-screen', { timeout: 10000 }).catch(() => {});
}

export async function checkDemoModeMutationDenial(page: Page, action: string) {
  const responsePromise = page.waitForResponse(response => 
    response.url().includes('/api/muse') && response.request().method() === 'POST'
  );
  
  await page.evaluate(action => {
    const event = new CustomEvent('muse-demo-action', { detail: { action } });
    window.dispatchEvent(event);
  }, action);
  
  const response = await responsePromise;
  expect(response.status()).toBe(409);
  
  const body = await response.json();
  expect(body.error).toContain('DEMO_MODE');
}