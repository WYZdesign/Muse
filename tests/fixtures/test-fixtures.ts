import { test as base, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type TestFixtures = {
  axe: AxeBuilder;
  demoPage: Page;
  authPage: Page;
};

export const test = base.extend<TestFixtures>({
  axe: async ({ page }, use) => {
    await use(new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']));
  },
  demoPage: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForSelector('#splash-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await use(page);
  },
  authPage: async ({ page }, use) => {
    await page.goto('/muse');
    await page.waitForSelector('#splash-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await use(page);
  },
});

export { expect } from '@playwright/test';