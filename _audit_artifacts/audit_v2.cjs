const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const mockProfile = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Audit User',
    type: 'Photographer',
    avatar: '',
    age_verified: true,
    tier: 'muse_pro',
    founding_tier: 'founding',
    pro_expires_at: ''
  };
  const mockUser = { id: '00000000-0000-0000-0000-000000000001', email: 'audit@test.com' };

  // Inject localStorage BEFORE page loads
  await context.addInitScript(() => {
    const mockUser = {
      access_token: 'mock_token_for_audit',
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
          founding_tier: 'founding',
          pro_expires_at: ''
        }
      }
    };
    localStorage.setItem('muse_user', JSON.stringify(mockUser));
  });

  const page = await context.newPage();

  // Intercept ALL API calls
  await page.route('**/api/muse/**', async route => {
    const url = route.request().url();
    if (url.includes('/api/muse/auth')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: mockUser, profile: mockProfile }) });
    } else if (url.includes('/api/muse/profiles') || url.includes('/api/muse/discover')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, profiles: [] }) });
    } else if (url.includes('/api/muse/matches')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, matches: [] }) });
    } else if (url.includes('/api/muse/messages')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, messages: [] }) });
    } else if (url.includes('/api/muse/moments')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, moments: [] }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
  });

  // Also intercept Supabase auth calls to succeed
  await page.route('**/*.supabase.co/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/v1/token') || url.includes('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        access_token: 'mock_token_for_audit',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_refresh',
        user: { id: '00000000-0000-0000-0000-000000000001', email: 'audit@test.com' }
      }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  console.log('Navigating to Muse...');
  await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(10000);

  const screen = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('muse_state') || '{}').screen || 'unknown'; } catch { return 'unknown'; }
  });
  console.log('Current screen state:', screen);

  // Check what's visible
  const visibleText = await page.evaluate(() => {
    const el = document.querySelector('.screen-el[style*="display: flex"]') || document.querySelector('.screen-el:not([style*="display: none"])');
    return el ? el.className + ' | ' + el.textContent.substring(0, 200) : 'no screen-el found';
  });
  console.log('Visible element:', visibleText);

  await page.screenshot({ path: path.join(__dirname, 'audit_screen1.png'), fullPage: false });
  console.log('Captured: audit_screen1.png');

  // Navigate to other screens via nav buttons
  const navMap = [
    { screen: 'connections', labels: ['feed', 'connections'] },
    { screen: 'matches', labels: ['matches'] },
    { screen: 'moments', labels: ['bts', 'moments'] },
    { screen: 'profile', labels: ['profile', 'menu'] },
  ];

  for (const nav of navMap) {
    const clicked = await page.evaluate((labels) => {
      const buttons = document.querySelectorAll('.nav-item');
      for (const btn of buttons) {
        const label = btn.querySelector('.nav-label');
        if (label) {
          const text = label.textContent.trim().toLowerCase();
          if (labels.includes(text)) {
            btn.click();
            return text;
          }
        }
      }
      return null;
    }, nav.labels);
    console.log(`Clicked nav: ${clicked || 'NOT FOUND'} for screen: ${nav.screen}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, `audit_${nav.screen}.png`), fullPage: false });
    console.log(`Captured: audit_${nav.screen}.png`);
  }

  // Go back to discover and full page
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('.nav-item');
    for (const btn of buttons) {
      const label = btn.querySelector('.nav-label');
      if (label && label.textContent.trim().toLowerCase() === 'discover') { btn.click(); return; }
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'audit_discover_full.png'), fullPage: true });
  console.log('Captured: audit_discover_full.png');

  await browser.close();
  console.log('Done.');
})();
