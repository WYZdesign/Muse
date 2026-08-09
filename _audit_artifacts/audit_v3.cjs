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

  await page.route('**/*.supabase.co/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  console.log('Navigating...');
  await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);

  // Click Collab tab specifically
  console.log('Clicking Collab...');
  const collabClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('.nav-item');
    for (const btn of buttons) {
      const label = btn.querySelector('.nav-label');
      if (label && label.textContent.trim().toLowerCase() === 'collab') {
        btn.click();
        return true;
      }
    }
    return false;
  });
  console.log('Collab clicked:', collabClicked);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'audit_collab_new.png'), fullPage: false });
  console.log('Captured: audit_collab_new.png');

  // Click Menu to get to Profile
  console.log('Clicking Menu...');
  const menuClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('.nav-item');
    for (const btn of buttons) {
      const label = btn.querySelector('.nav-label');
      if (label && label.textContent.trim().toLowerCase() === 'menu') {
        btn.click();
        return true;
      }
    }
    return false;
  });
  console.log('Menu clicked:', menuClicked);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'audit_menu.png'), fullPage: false });
  console.log('Captured: audit_menu.png');

  // Check if profile link exists in hamburger menu
  const profileLink = await page.evaluate(() => {
    const links = document.querySelectorAll('[class*="hamburger"] button, [class*="menu"] button, [class*="drawer"] button');
    for (const link of links) {
      if (link.textContent.toLowerCase().includes('profile')) {
        link.click();
        return true;
      }
    }
    // Try clicking any element that says Profile
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if (el.textContent.trim() === 'Profile' && el.tagName !== 'SCRIPT') {
        el.click();
        return true;
      }
    }
    return false;
  });
  console.log('Profile link found:', profileLink);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'audit_profile_new.png'), fullPage: false });
  console.log('Captured: audit_profile_new.png');

  // Go to settings if possible
  const settingsClicked = await page.evaluate(() => {
    const allEls = document.querySelectorAll('button, [role="button"]');
    for (const el of allEls) {
      if (el.textContent.trim().toLowerCase().includes('settings') || el.getAttribute('aria-label')?.toLowerCase().includes('settings')) {
        el.click();
        return true;
      }
    }
    return false;
  });
  console.log('Settings clicked:', settingsClicked);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'audit_settings.png'), fullPage: false });
  console.log('Captured: audit_settings.png');

  await browser.close();
  console.log('Done.');
})();
