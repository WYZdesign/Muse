const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  
  // ═══ TEST 1: BLANK SCREEN ON REFRESH ═══
  console.log('═══ TEST 1: FRESH LOAD ═══');
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  const freshState = await page.evaluate(() => ({
    screenElCount: document.querySelectorAll('.screen-el').length,
    activeCount: Array.from(document.querySelectorAll('.screen-el')).filter(el => el.classList.contains('active')).length,
    phoneVisible: !!document.querySelector('.phone'),
    bodyText: document.body.textContent?.substring(0, 200),
  }));
  console.log('Fresh load:', JSON.stringify(freshState));
  await page.screenshot({ path: 'final_01_fresh.png', fullPage: false });
  
  // ═══ TEST 2: REGISTER + ONBOARD ═══
  console.log('\n═══ TEST 2: REGISTER + ONBOARD ═══');
  const ts = Date.now();
  const testEmail = `audit${ts}@test.dev`;
  await page.type('input[type="email"]', testEmail, { delay: 10 });
  await page.type('input[type="password"]', 'TestPass!2026', { delay: 10 });
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(5000);
  
  // Skip through all onboard steps
  for (let i = 0; i < 25; i++) {
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
  
  // ═══ TEST 3: DISCOVER CARD ═══
  console.log('\n═══ TEST 3: DISCOVER CARD ═══');
  const cardState = await page.evaluate(() => {
    const card = document.querySelector('.swipe-card.top-card');
    if (!card) return { error: 'no card' };
    const scroll = card.querySelector('.card-info-scroll');
    const details = card.querySelector('.card-details');
    const actions = card.querySelector('.card-actions-row');
    const heroInfo = card.querySelector('.card-hero-info');
    const heroName = card.querySelector('.card-hero-name');
    return {
      cardW: Math.round(card.getBoundingClientRect().width),
      cardH: Math.round(card.getBoundingClientRect().height),
      scrollable: scroll ? scroll.scrollHeight > scroll.clientHeight : false,
      scrollHeight: scroll?.scrollHeight || 0,
      clientHeight: scroll?.clientHeight || 0,
      detailsMargin: details?.style.marginTop || getComputedStyle(details || document.createElement('div')).marginTop,
      actionsVisible: actions ? actions.offsetParent !== null : false,
      actionsHeight: actions?.offsetHeight || 0,
      heroInfoVisible: heroInfo ? getComputedStyle(heroInfo).opacity !== '0' : false,
      heroNameText: heroName?.textContent?.substring(0, 30) || 'none',
    };
  });
  console.log('Card:', JSON.stringify(cardState));
  await page.screenshot({ path: 'final_02_discover.png', fullPage: false });
  
  // Scroll card down
  await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (scroll) scroll.scrollTop = 400;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'final_03_card_scrolled.png', fullPage: false });
  console.log('Card scrolled to 400px');
  
  // Scroll card to max
  await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'final_04_card_bottom.png', fullPage: false });
  console.log('Card scrolled to bottom');
  
  // ═══ TEST 4: NAV BUTTONS ═══
  console.log('\n═══ TEST 4: NAV ═══');
  const navState = await page.evaluate(() => {
    const navBtns = document.querySelectorAll('.nav-item');
    const visible = Array.from(navBtns).filter(b => b.offsetParent !== null);
    return {
      total: navBtns.length,
      visibleCount: visible.length,
      visibleTexts: visible.map(b => b.textContent.trim()),
      visibleRects: visible.map(b => ({
        text: b.textContent.trim(),
        x: Math.round(b.getBoundingClientRect().x),
        y: Math.round(b.getBoundingClientRect().y),
        w: Math.round(b.getBoundingClientRect().width),
        h: Math.round(b.getBoundingClientRect().height),
      })),
    };
  });
  console.log('Nav:', JSON.stringify(navState));
  
  // ═══ TEST 5: ALL SCREENS ═══
  console.log('\n═══ TEST 5: NAVIGATE ALL SCREENS ═══');
  
  // Feed
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim() === 'Feed') b.click();
    });
  });
  await page.waitForTimeout(2000);
  const feedActive = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    return el ? el.textContent.substring(0, 80) : 'NONE';
  });
  console.log('Feed screen:', feedActive);
  await page.screenshot({ path: 'final_05_feed.png', fullPage: false });
  
  // Collab
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim() === 'Collab') b.click();
    });
  });
  await page.waitForTimeout(2000);
  const collabActive = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    return el ? el.textContent.substring(0, 80) : 'NONE';
  });
  console.log('Collab screen:', collabActive);
  await page.screenshot({ path: 'final_06_collab.png', fullPage: false });
  
  // Matches
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim() === 'Matches') b.click();
    });
  });
  await page.waitForTimeout(2000);
  const matchesActive = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    return el ? el.textContent.substring(0, 80) : 'NONE';
  });
  console.log('Matches screen:', matchesActive);
  await page.screenshot({ path: 'final_07_matches.png', fullPage: false });
  
  // BTS
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim() === 'BTS') b.click();
    });
  });
  await page.waitForTimeout(2000);
  const btsActive = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    return el ? el.textContent.substring(0, 80) : 'NONE';
  });
  console.log('BTS screen:', btsActive);
  await page.screenshot({ path: 'final_08_bts.png', fullPage: false });
  
  // Menu
  await page.evaluate(() => {
    const navBtns = Array.from(document.querySelectorAll('.nav-item'));
    const menuBtn = navBtns.filter(b => b.offsetParent !== null).pop();
    if (menuBtn) menuBtn.click();
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'final_09_menu.png', fullPage: false });
  
  const menuContent = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    if (!active) return 'NO ACTIVE';
    const text = active.textContent;
    return {
      hasCommunity: text.includes('Community'),
      hasSessions: text.includes('Sessions'),
      hasNetwork: text.includes('Network'),
      hasProfile: text.includes('Profile'),
      hasSettings: text.includes('Settings'),
      hasMusePro: text.includes('Muse Pro'),
      first300: text.substring(0, 300),
    };
  });
  console.log('Menu:', JSON.stringify(menuContent));
  
  // Profile
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const profileBtn = btns.find(b => b.offsetParent !== null && b.textContent.trim() === 'Profile');
    if (profileBtn) profileBtn.click();
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'final_10_profile.png', fullPage: false });
  
  const profileContent = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    if (!active) return 'NO ACTIVE';
    const text = active.textContent;
    return {
      hasAll: text.includes('All'),
      hasPortrait: text.includes('Portrait'),
      hasLandscape: text.includes('Landscape'),
      hasSets: text.includes('Sets'),
      hasManageAlbums: text.includes('Manage Albums'),
      hasEditProfile: text.includes('Edit Profile'),
    };
  });
  console.log('Profile:', JSON.stringify(profileContent));
  
  // Scroll profile down
  await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    if (active) active.scrollTop = 400;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'final_11_profile_scrolled.png', fullPage: false });
  
  // Settings
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const settingsBtn = btns.find(b => b.offsetParent !== null && b.textContent.trim() === 'Settings');
    if (settingsBtn) settingsBtn.click();
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'final_12_settings.png', fullPage: false });
  
  // ═══ TEST 6: REFRESH (blank screen test) ═══
  console.log('\n═══ TEST 6: REFRESH ═══');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  
  const refreshState = await page.evaluate(() => ({
    screenElCount: document.querySelectorAll('.screen-el').length,
    activeCount: Array.from(document.querySelectorAll('.screen-el')).filter(el => el.classList.contains('active')).length,
    phoneVisible: !!document.querySelector('.phone'),
    navBtnCount: Array.from(document.querySelectorAll('.nav-item')).filter(b => b.offsetParent !== null).length,
    bodyTextStart: document.body.textContent?.substring(0, 100),
  }));
  console.log('After refresh:', JSON.stringify(refreshState));
  await page.screenshot({ path: 'final_13_after_refresh.png', fullPage: false });
  
  console.log('\n═══ ERRORS ═══');
  errors.forEach(e => console.log('  ', e));
  
  await browser.close();
})();
