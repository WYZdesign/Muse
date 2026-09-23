import { test, expect } from '../fixtures/test-fixtures';
import { checkDemoModeMutationDenial, loginAsDemoUser } from '../helpers/test-helpers';

// Real mutation families registered in ACTIONS (src/app/api/muse/route.ts).
// All are absent from DEMO_READ_ACTIONS, so the server demo gate must return
// 409 {code:"DEMO_MODE"} before auth or handler dispatch.
const MUTATION_FAMILIES = [
  'feed',
  'profile',
  'match',
  'message',
  'brief',
  'book-session',
  'create-album',
] as const;

// CI job e2e-demo-negative runs: --grep "Demo Mode Negative"
test.describe('Demo Mode Negative', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  for (const action of MUTATION_FAMILIES) {
    test(`blocks ${action} with 409 DEMO_MODE`, async ({ page }) => {
      await checkDemoModeMutationDenial(page, action);
    });
  }

  test('safe user-facing copy for blocked mutations', async ({ page }) => {
    const response = await page.request.post('/api/muse', {
      data: { action: 'feed' },
      failOnStatusCode: false,
      headers: {
        Origin: 'https://muse.wyzdesign.com',
        Referer: 'https://muse.wyzdesign.com/muse',
      },
    });
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('DEMO_MODE');
    expect(body.error).toMatch(/unavailable in demo mode/i);
    expect(body.error).not.toMatch(/stack|trace|internal|exception|\/src\/|node_modules/i);
    expect(body.error).not.toMatch(/\/(home|Users|home\/|[A-Za-z]:\\)/i);
  });
});

test.describe('Demo Mode Configuration', () => {
  test('Server demo gate rejects non-read actions', async ({ page }) => {
    const response = await page.request.post('/api/muse', {
      data: { action: 'feed' },
      failOnStatusCode: false,
      headers: {
        Origin: 'https://muse.wyzdesign.com',
        Referer: 'https://muse.wyzdesign.com/muse',
      },
    });
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('DEMO_MODE');
    expect(body.error).toMatch(/unavailable in demo mode/i);
  });
});

// Kept separate from the server-boundary suite: brittle UI nav must not
// weaken API assertions if Collab entry points change (ChatGPT owns page.tsx).
test.describe('Demo Mode UI Badge', () => {
  test('Collab view shows DEMO PREVIEW badge', async ({ page }) => {
    // Soft-skip only when the app shell itself is down (e.g. ChatGPT mid-split
    // page.tsx TDZ). API Demo Mode Negative tests above must stay hard asserts.
    const shell = await page.request.get('/muse', { failOnStatusCode: false });
    test.skip(
      shell.status() !== 200,
      `App shell unavailable (/muse -> ${shell.status()}); UI badge blocked until page.tsx is healthy`,
    );

    await loginAsDemoUser(page);
    const collabTab = page.locator('button.nav-item[aria-label="Collab"]').first();
    if (await collabTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await collabTab.click();
    } else {
      await page.locator('button.nav-item').filter({ hasText: 'Collab' }).first().click({ timeout: 10000 });
    }
    await expect(page.locator('[data-screen="briefs"].active')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('DEMO PREVIEW').first()).toBeVisible({ timeout: 10000 });
  });
});
