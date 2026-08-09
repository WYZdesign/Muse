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

  // Check if portfolio section exists
  const portfolioExists = await page.evaluate(() => {
    const sections = document.querySelectorAll('.section-title');
    for (const s of sections) {
      if (s.textContent.includes('Portfolio')) return s.textContent;
    }
    return null;
  });
  console.log('Portfolio section found:', portfolioExists);

  // Scroll step by step and capture
  const scroll = await page.$('.profile-scroll');
  if (scroll) {
    for (let i = 0; i < 10; i++) {
      await page.evaluate((pos) => {
        const s = document.querySelector('.profile-scroll');
        if (s) s.scrollTop = pos;
      }, i * 200);
      await page.waitForTimeout(300);
    }
  }

  // Find portfolio section and scroll to it
  await page.evaluate(() => {
    const titles = document.querySelectorAll('.section-title');
    for (const t of titles) {
      if (t.textContent.includes('Portfolio')) {
        t.scrollIntoView({ behavior: 'instant', block: 'start' });
        return;
      }
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'final_portfolio_tabs.png'), fullPage: false });
  console.log('Portfolio tabs captured');

  await browser.close();
})();
