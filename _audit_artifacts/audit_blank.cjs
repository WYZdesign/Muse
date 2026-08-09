const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  
  // Go to site — DON'T register, just check what loads
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // Check what's on the page
  const state = await page.evaluate(() => {
    const screenEls = document.querySelectorAll('.screen-el');
    const activeEls = Array.from(screenEls).filter(el => el.classList.contains('active'));
    const navDivs = document.querySelectorAll('.nav');
    const navBtns = document.querySelectorAll('.nav-item');
    const visibleNavBtns = Array.from(navBtns).filter(b => b.offsetParent !== null);
    const visibleNavDivs = Array.from(navDivs).filter(d => d.offsetParent !== null);
    
    return {
      screenElCount: screenEls.length,
      activeCount: activeEls.length,
      activeClasses: activeEls.map(el => el.className),
      activeText: activeEls.map(el => el.textContent?.substring(0, 100)),
      navDivCount: navDivs.length,
      visibleNavDivCount: visibleNavDivs.length,
      navBtnCount: navBtns.length,
      visibleNavBtnCount: visibleNavBtns.length,
      visibleNavBtnTexts: visibleNavBtns.map(b => b.textContent?.trim()),
      bodyText: document.body.textContent?.substring(0, 500),
      museUser: !!localStorage.getItem('muse_user'),
    };
  });
  console.log('=== INITIAL STATE (no auth) ===');
  console.log(JSON.stringify(state, null, 2));
  
  await page.screenshot({ path: 'blank_01_initial.png', fullPage: false });
  console.log('\nScreenshot: blank_01_initial.png');
  
  // Now register and go through onboard
  const ts = Date.now();
  await page.type('input[type="email"]', `blank${ts}@test.dev`, { delay: 10 });
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
  
  // Now check nav visibility with CORRECT selector
  const navState = await page.evaluate(() => {
    const navDivs = document.querySelectorAll('.nav');
    const navBtns = document.querySelectorAll('.nav-item');
    const visibleNavBtns = Array.from(navBtns).filter(b => b.offsetParent !== null);
    const visibleNavDivs = Array.from(navDivs).filter(d => d.offsetParent !== null);
    
    // Check each nav div's position
    const navInfo = Array.from(navDivs).map(d => ({
      visible: d.offsetParent !== null,
      rect: d.getBoundingClientRect(),
      childCount: d.children.length,
      display: getComputedStyle(d).display,
      position: getComputedStyle(d).position,
    }));
    
    return {
      navDivCount: navDivs.length,
      visibleNavDivCount: visibleNavDivs.length,
      navBtnCount: navBtns.length,
      visibleNavBtnCount: visibleNavBtns.length,
      visibleNavBtnTexts: visibleNavBtns.map(b => b.textContent?.trim()),
      navInfo: navInfo,
      // Check if screen has phone-wrap
      phoneWrap: !!document.querySelector('.phone-wrap'),
      phone: !!document.querySelector('.phone'),
      screenActive: document.querySelector('.screen-el.active')?.className,
    };
  });
  console.log('\n=== NAV STATE (after onboard) ===');
  console.log(JSON.stringify(navState, null, 2));
  
  await page.screenshot({ path: 'blank_02_after_onboard.png', fullPage: false });
  console.log('Screenshot: blank_02_after_onboard.png');
  
  // Now simulate a refresh — clear state and reload
  console.log('\n=== SIMULATING REFRESH ===');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  const refreshState = await page.evaluate(() => {
    return {
      screenElCount: document.querySelectorAll('.screen-el').length,
      activeCount: Array.from(document.querySelectorAll('.screen-el')).filter(el => el.classList.contains('active')).length,
      activeText: Array.from(document.querySelectorAll('.screen-el.active')).map(el => el.textContent?.substring(0, 100)),
      navBtnCount: document.querySelectorAll('.nav-item').length,
      visibleNavBtnCount: Array.from(document.querySelectorAll('.nav-item')).filter(b => b.offsetParent !== null).length,
      phoneVisible: !!document.querySelector('.phone'),
      bodyText: document.body.textContent?.substring(0, 300),
      museUser: !!localStorage.getItem('muse_user'),
    };
  });
  console.log(JSON.stringify(refreshState, null, 2));
  
  await page.screenshot({ path: 'blank_03_after_refresh.png', fullPage: false });
  console.log('Screenshot: blank_03_after_refresh.png');
  
  console.log('\n=== ERRORS ===');
  errors.forEach(e => console.log('  ', e));
  
  await browser.close();
})();
