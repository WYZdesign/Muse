import { test, expect } from '../fixtures/test-fixtures';
import { checkDemoModeMutationDenial, loginAsDemoUser } from '../helpers/test-helpers';

test.describe('Demo Mode Safety', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('Demo mode blocks like action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'like');
  });

  test('Demo mode blocks pass action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'pass');
  });

  test('Demo mode blocks super like action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'super_like');
  });

  test('Demo mode blocks send message action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'send_message');
  });

  test('Demo mode blocks create brief action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'create_brief');
  });

  test('Demo mode blocks create session action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'create_session');
  });

  test('Demo mode blocks save search action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'save_search');
  });

  test('Demo mode blocks update profile action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'update_profile');
  });

  test('Demo mode blocks upload media action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'upload_media');
  });

  test('Demo mode blocks delete account action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'delete_account');
  });

  test('Demo mode blocks connect Stripe action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'connect_stripe');
  });

  test('Demo mode blocks verify age action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'verify_age');
  });

  test('Demo mode blocks disclosure action with 409', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'create_disclosure');
  });

  test('Demo mode shows user-facing copy for blocked actions', async ({ page }) => {
    await checkDemoModeMutationDenial(page, 'like');
    await expect(page.locator('[data-toast], .toast, [role="alert"]')).toContainText(/demo|unavailable|demo mode/i);
  });
});

test.describe('Demo Mode Configuration', () => {
  test('Demo mode env var is set', async ({ page }) => {
    await page.goto('/muse');
    const demoMode = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-demo-mode') || 
             window.location.search.includes('demo=true') ||
             (window as any).MUSE_DEMO_MODE === true;
    });
    expect(demoMode).toBeTruthy();
  });

  test('Demo mode indicator is visible', async ({ page }) => {
    await page.goto('/muse/landing');
    await expect(page.locator('[data-demo-badge], .demo-badge, [data-demo-indicator]')).toBeVisible();
  });
});