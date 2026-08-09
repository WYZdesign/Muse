const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // Navigate to app first
  await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Inject mock auth state into localStorage
  await page.evaluate(() => {
    const mockUser = {
      access_token: 'mock_token',
      refresh_token: 'mock_refresh',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'audit@test.com',
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Audit User',
          type: 'Photographer',
          avatar: '',
          age_verified: true,
          tier: 'muse_pro',
          founding_tier: 'founding'
        }
      }
    };
    localStorage.setItem('muse_user', JSON.stringify(mockUser));
    localStorage.setItem('muse_state', JSON.stringify({
      screen: 'discover',
      currentUser: {
        name: 'Audit User',
        email: 'audit@test.com',
        avatar: '',
        type: 'Photographer',
        tier: 'muse_pro',
        foundingTier: 'founding',
        proExpiresAt: ''
      }
    }));
  });

  // Reload to pick up the mock auth
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Screenshot the discover/main screen
  await page.screenshot({ path: path.join(__dirname, 'audit_discover.png'), fullPage: false });
  console.log('Captured: audit_discover.png');

  // Try clicking each nav tab
  const tabs = [
    { name: 'feed', selector: 'text=Feed' },
    { name: 'matches', selector: 'text=Matches' },
    { name: 'collab', selector: 'text=Collab' },
    { name: 'bts', selector: 'text=BTS' },
    { name: 'profile', selector: 'text=Profile' },
  ];

  for (const tab of tabs) {
    try {
      const el = await page.$(tab.selector);
      if (el) {
        await el.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(__dirname, `audit_${tab.name}.png`), fullPage: false });
        console.log(`Captured: audit_${tab.name}.png`);
      } else {
        console.log(`Tab not found: ${tab.name} (${tab.selector})`);
      }
    } catch (e) {
      console.log(`Error clicking ${tab.name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
