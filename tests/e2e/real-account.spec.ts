import { test, expect } from '../fixtures/test-fixtures';
import { dismissPageTour } from '../helpers/test-helpers';
import fs from 'fs';

/**
 * Real-account flows. Skipped unless credentials are provided, because the app
 * requires a live session for these actions:
 *
 *   E2E_MUSE_EMAIL / E2E_MUSE_PASSWORD
 *
 * CI leaves them unset (the demo suites cover the shell). Run locally with real
 * credentials to exercise the authenticated paths.
 *
 * Deliberately read-only with respect to other members: these tests never send
 * a message to another person. Sending is covered by the unit/route tests and
 * would be an outward action against a real user.
 */
const EMAIL = process.env.E2E_MUSE_EMAIL || '';
const PASSWORD = process.env.E2E_MUSE_PASSWORD || '';
const enabled = Boolean(EMAIL && PASSWORD);

// The bottom nav (and the Menu that reaches Settings) only renders at phone
// widths; at desktop the app uses a different shell without those controls.
test.use({ viewport: { width: 390, height: 844 } });

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/muse', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.fill('input[aria-label="Email address"]', EMAIL);
  await page.fill('input[aria-label="Password"]', PASSWORD);
  await page.locator('button.btn-gold').last().click();
  await page.waitForTimeout(8000);
  // The daily-login reward modal appears once per day and intercepts clicks.
  const later = page.locator('.daily-login-dismiss');
  for (let i = 0; i < 6; i++) {
    if (await later.isVisible({ timeout: 1000 }).catch(() => false)) {
      await later.click().catch(() => {});
      break;
    }
    await page.waitForTimeout(500);
  }
  await dismissPageTour(page);
}

test.describe('Real account', () => {
  test.skip(!enabled, 'Set E2E_MUSE_EMAIL and E2E_MUSE_PASSWORD to run');

  test('data export downloads a valid JSON document', async ({ page }) => {
    await signIn(page);
    await page.locator('.nav-item[aria-label="Menu"]').first().click();
    await page.waitForTimeout(800);
    await page.getByText('Settings', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await dismissPageTour(page);

    const row = page.getByRole('button', { name: /download my data/i });
    await expect(row).toBeVisible();
    await row.scrollIntoViewIfNeeded();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      row.click(),
    ]);

    const file = await download.path();
    expect(file).toBeTruthy();
    const raw = fs.readFileSync(file as string, 'utf8');
    const data = JSON.parse(raw);

    expect(data.meta?.format).toBe('muse-data-export');
    expect(data.meta?.version).toBe(1);
    expect(data.account?.id).toBeTruthy();
    expect(data.profile?.id).toBeTruthy();
    for (const key of ['feedPosts', 'messages', 'bookings', 'quests', 'reportsFiled', 'notifications']) {
      expect(Array.isArray(data[key]), `${key} must be an array`).toBe(true);
    }
    // The export must not leak auth internals.
    expect(raw).not.toContain('service_role');
    expect(JSON.stringify(data.account)).not.toMatch(/refresh_token|access_token/i);
  });

  test('chat opens with a named composer and no horizontal overflow', async ({ page }) => {
    await signIn(page);

    await page.locator('.nav-item[aria-label^="Musa"]').first().click();
    await page.waitForTimeout(2000);
    await dismissPageTour(page);

    const firstChat = page.getByRole('button', { name: /open chat with/i }).first();
    if ((await firstChat.count()) === 0) test.skip(true, 'Account has no conversations');
    await firstChat.click();
    await page.waitForTimeout(2500);

    const composer = page.locator('.chat-input-wrap').first();
    await expect(composer).toBeVisible();
    // The first input in the composer is the hidden file picker; target the text field.
    const input = composer.locator('.chat-inp').first();
    await expect(input).toBeVisible();
    // The composer input must be reachable by an accessible name.
    const name = (await input.getAttribute('aria-label')) || (await input.getAttribute('placeholder')) || '';
    expect(name.length).toBeGreaterThan(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});



