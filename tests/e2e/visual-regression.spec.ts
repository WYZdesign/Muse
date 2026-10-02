import { test, expect } from '../fixtures/test-fixtures';
import { checkAccessibility, checkTouchTargets, checkNoHorizontalOverflow, checkSkipLink, checkPageTour, checkDiscoverQueueIsolation, dismissPageTour, loginAsDemoUser } from '../helpers/test-helpers';

const VIEWPORTS = [
  { name: '320px', width: 320, height: 568 },
  { name: '375px', width: 375, height: 667 },
  { name: '390px', width: 390, height: 844 },
  { name: '452px', width: 452, height: 991 },
  { name: '768px', width: 768, height: 1024 },
];

type AppScreen = 'discover' | 'connections' | 'profile' | 'settings';

async function openAppScreen(page: Parameters<typeof loginAsDemoUser>[0], screen: AppScreen) {
  await loginAsDemoUser(page, { screen });
  await dismissPageTour(page);
  await page.waitForSelector(`[data-screen="${screen}"].active`, { timeout: 15000 });
}

test.describe('Mobile Visual UX Regression', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} viewport`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('app shell renders without horizontal overflow', async ({ page }) => {
        await openAppScreen(page, 'discover');
        await checkNoHorizontalOverflow(page);
      });

      test('Discover card layout', async ({ page }) => {
        await openAppScreen(page, 'discover');
        await checkNoHorizontalOverflow(page);
        
        const cards = page.locator('[data-card-index], .discover-card, [data-profile-card]');
        const count = await cards.count();
        if (count > 0) {
          const firstCard = cards.first();
          const box = await firstCard.boundingBox();
          expect(box?.width).toBeLessThanOrEqual(viewport.width);
        }
      });

      test('Feed composer layout', async ({ page }) => {
        await openAppScreen(page, 'connections');
        await checkNoHorizontalOverflow(page);
      });

      test('Profile screen layout', async ({ page }) => {
        await openAppScreen(page, 'profile');
        await checkNoHorizontalOverflow(page);
      });

      test('Settings screen layout', async ({ page }) => {
        await openAppScreen(page, 'settings');
        await checkNoHorizontalOverflow(page);
      });

      test('All touch targets meet 44px minimum', async ({ page }) => {
        await openAppScreen(page, 'discover');
        await checkTouchTargets(page, 44);
      });
    });
  }
});

test.describe('Accessibility Regression', () => {
  test('Landing page passes axe-core WCAG 2.1 AA', async ({ page, axe }) => {
    await page.goto('/muse/landing');
    await checkAccessibility(page);
  });

  test('Discover screen passes axe-core WCAG 2.1 AA', async ({ page, axe }) => {
    await openAppScreen(page, 'discover');
    await checkAccessibility(page);
  });

  test('Feed screen passes axe-core WCAG 2.1 AA', async ({ page, axe }) => {
    await openAppScreen(page, 'connections');
    await checkAccessibility(page);
  });

  test('Profile screen passes axe-core WCAG 2.1 AA', async ({ page, axe }) => {
    await openAppScreen(page, 'profile');
    await checkAccessibility(page);
  });

  test('Settings screen passes axe-core WCAG 2.1 AA', async ({ page, axe }) => {
    await openAppScreen(page, 'settings');
    await checkAccessibility(page);
  });

  test('Skip link is accessible', async ({ page }) => {
    await page.goto('/muse/landing');
    await checkSkipLink(page);
  });

  test('Page tour has 44px touch targets', async ({ page }) => {
    await loginAsDemoUser(page, { seedTours: false });
    await checkPageTour(page, 'discover');
  });

  test('Discover queue cards are inert and aria-hidden', async ({ page }) => {
    await openAppScreen(page, 'discover');
    await checkDiscoverQueueIsolation(page);
  });
});

test.describe('Visual Regression Screenshots', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('Landing page matches baseline', async ({ page }) => {
        await page.goto('/muse/landing');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot(`landing-${viewport.name}.png`, { fullPage: true });
      });

      test('Discover screen matches baseline', async ({ page }) => {
        await openAppScreen(page, 'discover');
        await expect(page).toHaveScreenshot(`discover-${viewport.name}.png`, { fullPage: true });
      });

      test('Feed screen matches baseline', async ({ page }) => {
        await openAppScreen(page, 'connections');
        await expect(page).toHaveScreenshot(`feed-${viewport.name}.png`, { fullPage: true });
      });

      test('Profile screen matches baseline', async ({ page }) => {
        await openAppScreen(page, 'profile');
        await expect(page).toHaveScreenshot(`profile-${viewport.name}.png`, { fullPage: true });
      });
    });
  }
});
