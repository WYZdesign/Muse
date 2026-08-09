const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  await context.addInitScript(() => {
    localStorage.setItem('muse_user', JSON.stringify({
      access_token: 'mock', refresh_token: 'mock',
      user: { id: '00000000-0000-0000-0000-000000000001', email: 'audit@test.com',
        profile: { id: '00000000-0000-0000-0000-000000000001', name: 'Audit User', type: 'Photographer', avatar: '', age_verified: true, tier: 'muse_pro', founding_tier: 'founding', pro_expires_at: '' } }
    }));
  });

  const page = await context.newPage();
  await page.route('**/api/muse/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: '1', email: 'audit@test.com' }, profile: { id: '1', name: 'Audit User', type: 'Photographer', avatar: '', age_verified: true, tier: 'muse_pro', founding_tier: 'founding' }, profiles: [], matches: [], messages: [], moments: [], briefs: [] }) });
  });
  await page.route('**/*.supabase.co/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);

  // Navigate to profile
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.nav-item');
    const last = btns[btns.length - 1];
    if (last) last.click();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const items = document.querySelectorAll('.hamburger-item');
    for (const item of items) {
      const label = item.querySelector('.hamburger-item-label');
      if (label && label.textContent.includes('Profile')) { item.click(); return; }
    }
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const items = document.querySelectorAll('.hamburger-item, button');
    for (const item of items) {
      if (item.textContent.includes('Edit Profile')) { item.click(); return; }
    }
  });
  await page.waitForTimeout(2000);

  // Scroll down to portfolio section
  await page.evaluate(() => {
    const scroll = document.querySelector('.profile-scroll');
    if (scroll) scroll.scrollTop = 800;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'final_profile_scrolled.png'), fullPage: false });
  console.log('Profile scrolled captured');

  await browser.close();
})();
