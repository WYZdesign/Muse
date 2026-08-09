const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  // Register fresh
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const ts = Date.now();
  await page.type('input[type="email"]', `verify${ts}@testmail.dev`, { delay: 10 });
  await page.type('input[type="password"]', 'TestPass!2026', { delay: 10 });
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(5000);
  
  // Skip onboard
  for (let i = 0; i < 20; i++) {
    const r = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
      const find = (t) => btns.find(b => b.textContent.trim().includes(t));
      const skip = find('Skip'); if (skip) { skip.click(); return 'skip'; }
      const next = find('→'); if (next) { next.click(); return 'next'; }
      const cont = find('Next'); if (cont) { cont.click(); return 'next'; }
      const enter = find('Enter Muse'); if (enter) { enter.click(); return 'enter'; }
      const start = find('Get Started'); if (start) { start.click(); return 'start'; }
      return 'none';
    });
    if (r === 'enter') break;
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(3000);
  
  console.log('=== VERIFICATION AUDIT ===\n');
  
  // 1. CHECK: Full-width action buttons on Discover
  const actionBtns = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    if (!active) return { error: 'no active screen' };
    const btns = active.querySelectorAll('.card-action-btn');
    return Array.from(btns).map(b => ({
      text: b.textContent.trim(),
      width: b.getBoundingClientRect().width,
      visible: b.offsetParent !== null
    }));
  });
  console.log('1. DISCOVER ACTION BUTTONS:', JSON.stringify(actionBtns));
  
  // 2. CHECK: card-actions-row exists
  const hasCardActionsRow = await page.evaluate(() => {
    return !!document.querySelector('.card-actions-row');
  });
  console.log('2. card-actions-row class:', hasCardActionsRow);
  
  // 3. CHECK: Hero text shadow
  const heroShadow = await page.evaluate(() => {
    const el = document.querySelector('.card-hero-name');
    if (!el) return 'not found';
    return getComputedStyle(el).textShadow;
  });
  console.log('3. Hero name text-shadow:', heroShadow);
  
  // 4. NAV: Check all 6 tabs visible and correctly sized
  const navTabs = await page.evaluate(() => {
    const navBtns = document.querySelectorAll('nav button');
    return Array.from(navBtns).filter(b => b.offsetParent !== null).map(b => ({
      text: b.textContent.trim(),
      width: Math.round(b.getBoundingClientRect().width),
      height: Math.round(b.getBoundingClientRect().height),
      active: b.classList.contains('active')
    }));
  });
  console.log('4. NAV TABS:', JSON.stringify(navTabs));
  
  // 5. Navigate to Menu - check Muse Pro item
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const menuBtn = btns.filter(b => b.offsetParent !== null).pop();
    if (menuBtn) menuBtn.click();
  });
  await page.waitForTimeout(2000);
  
  const menuItems = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    if (!active) return 'no active';
    return active.textContent.substring(0, 400);
  });
  console.log('5. MENU CONTENT:', menuItems);
  
  const hasMusePro = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    return active ? active.textContent.includes('Muse Pro') : false;
  });
  console.log('6. Muse Pro in menu:', hasMusePro);
  
  // 7. Navigate to Profile - check portfolio tabs
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const profileBtn = btns.find(b => b.offsetParent !== null && b.textContent.trim() === 'Profile');
    if (profileBtn) profileBtn.click();
  });
  await page.waitForTimeout(2000);
  
  const profileTabs = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    if (!active) return 'no active';
    const text = active.textContent;
    return {
      hasAll: text.includes('All'),
      hasPortrait: text.includes('Portrait'),
      hasLandscape: text.includes('Landscape'),
      hasSets: text.includes('Sets'),
      hasManageAlbums: text.includes('Manage Albums'),
      content: text.substring(0, 500)
    };
  });
  console.log('7. PROFILE PORTFOLIO TABS:', JSON.stringify(profileTabs));
  
  // 8. Check Discover card structure (rewind/pass/super/like/note)
  // Navigate back to discover
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const discoverBtn = btns.find(b => b.offsetParent !== null && b.textContent.trim() === 'Discover');
    if (discoverBtn) discoverBtn.click();
  });
  await page.waitForTimeout(2000);
  
  const cardButtons = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    if (!active) return 'no active';
    const btns = active.querySelectorAll('.card-action-btn, .action-btn, .card-actions-row button');
    return Array.from(btns).filter(b => b.offsetParent !== null || true).map(b => ({
      text: b.textContent.trim(),
      width: b.getBoundingClientRect().width,
      classes: b.className
    }));
  });
  console.log('8. DISCOVER CARD BUTTONS:', JSON.stringify(cardButtons));
  
  // 9. Check if "LIKENOPE" old format still exists or is replaced
  const oldFormat = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    return active ? active.textContent.includes('LIKENOPE') : false;
  });
  console.log('9. Old LIKENOPE format present:', oldFormat);
  
  // 10. Check aurora/stars/sparkle elements
  const bgEffects = await page.evaluate(() => ({
    aurora: !!document.querySelector('.aurora-strip'),
    waves: !!document.querySelector('.ocean-waves'),
    sparkle: !!document.querySelector('.sparkle-field'),
    star: !!document.querySelector('.star-field'),
    nebula: !!document.querySelector('.nebula-fog'),
  }));
  console.log('10. BG EFFECTS:', JSON.stringify(bgEffects));
  
  // 11. Screenshot final discover view with buttons visible
  await page.screenshot({ path: 'verify_discover.png', fullPage: false });
  console.log('\nScreenshot: verify_discover.png');
  
  // 12. Scroll discover card to see full card
  await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    const card = active?.querySelector('.swipe-card');
    if (card) card.scrollTop = card.scrollHeight;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'verify_discover_scrolled.png', fullPage: false });
  console.log('Screenshot: verify_discover_scrolled.png');
  
  await browser.close();
})();
