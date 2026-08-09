const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  
  // Register fresh
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const ts = Date.now();
  await page.type('input[type="email"]', `cardtest${ts}@testmail.dev`, { delay: 10 });
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
  
  // AUDIT: Check active screen
  const screenState = await page.evaluate(() => {
    const allScreenEls = document.querySelectorAll('.screen-el');
    const activeEls = Array.from(allScreenEls).filter(el => el.classList.contains('active'));
    return {
      totalScreens: allScreenEls.length,
      activeScreens: activeEls.length,
      activeContent: activeEls.map(el => el.textContent.substring(0, 100)),
      navVisible: Array.from(document.querySelectorAll('nav button')).filter(b => b.offsetParent !== null).length
    };
  });
  console.log('=== SCREEN STATE ===');
  console.log(JSON.stringify(screenState, null, 2));
  
  // Screenshot 1: Default card view (hero image)
  await page.screenshot({ path: 'audit_01_card_default.png', fullPage: false });
  console.log('audit_01_card_default.png');
  
  // AUDIT: Card element measurements
  const cardMetrics = await page.evaluate(() => {
    const card = document.querySelector('.swipe-card.top-card');
    if (!card) return { error: 'no top-card found' };
    const rect = card.getBoundingClientRect();
    const hero = card.querySelector('.card-hero');
    const heroRect = hero?.getBoundingClientRect();
    const heroImg = card.querySelector('.card-hero img');
    const infoScroll = card.querySelector('.card-info-scroll');
    const details = card.querySelector('.card-details');
    const actionsRow = card.querySelector('.card-actions-row');
    const heroInfo = card.querySelector('.card-hero-info');
    
    return {
      card: { w: Math.round(rect.width), h: Math.round(rect.height), top: Math.round(rect.top), left: Math.round(rect.left) },
      hero: heroRect ? { w: Math.round(heroRect.width), h: Math.round(heroRect.height) } : null,
      heroImg: heroImg ? {
        naturalW: heroImg.naturalWidth,
        naturalH: heroImg.naturalHeight,
        src: heroImg.src.substring(0, 80),
        objectFit: getComputedStyle(heroImg).objectFit
      } : null,
      infoScroll: infoScroll ? {
        scrollHeight: infoScroll.scrollHeight,
        clientHeight: infoScroll.clientHeight,
        scrollTop: infoScroll.scrollTop,
        overflowY: getComputedStyle(infoScroll).overflowY,
        pointerEvents: getComputedStyle(infoScroll).pointerEvents,
        background: getComputedStyle(infoScroll).background.substring(0, 60),
      } : null,
      details: details ? {
        marginTop: getComputedStyle(details).marginTop,
        offsetTop: details.offsetTop,
        offsetHeight: details.offsetHeight,
        background: getComputedStyle(details).background.substring(0, 60),
      } : null,
      actionsRow: actionsRow ? {
        display: getComputedStyle(actionsRow).display,
        opacity: getComputedStyle(actionsRow).opacity,
        pointerEvents: getComputedStyle(actionsRow).pointerEvents,
        bottom: getComputedStyle(actionsRow).bottom,
        offsetHeight: actionsRow.offsetHeight,
      } : null,
      heroInfo: heroInfo ? {
        display: getComputedStyle(heroInfo).display,
        opacity: getComputedStyle(heroInfo).opacity,
        offsetTop: heroInfo.offsetTop,
        offsetHeight: heroInfo.offsetHeight,
      } : null,
    };
  });
  console.log('\n=== CARD METRICS ===');
  console.log(JSON.stringify(cardMetrics, null, 2));
  
  // Screenshot 2: Try to scroll the card down
  await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (scroll) scroll.scrollTop = 300;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'audit_02_card_scrolled_300.png', fullPage: false });
  console.log('audit_02_card_scrolled_300.png');
  
  // Screenshot 3: Scroll more
  await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (scroll) scroll.scrollTop = 600;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'audit_03_card_scrolled_600.png', fullPage: false });
  console.log('audit_03_card_scrolled_600.png');
  
  // Screenshot 4: Scroll to max
  await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'audit_04_card_scrolled_max.png', fullPage: false });
  console.log('audit_04_card_scrolled_max.png');
  
  // AUDIT: Can we actually scroll? Check scrollability
  const scrollAudit = await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (!scroll) return { error: 'no scroll container' };
    const before = scroll.scrollTop;
    scroll.scrollTop = 9999;
    const after = scroll.scrollTop;
    scroll.scrollTop = 0;
    return {
      scrollable: after > before,
      maxScroll: after,
      containerHeight: scroll.clientHeight,
      contentHeight: scroll.scrollHeight,
      overflowY: getComputedStyle(scroll).overflowY,
      pointerEvents: getComputedStyle(scroll).pointerEvents,
      position: getComputedStyle(scroll).position,
      zIndex: getComputedStyle(scroll).zIndex,
    };
  });
  console.log('\n=== SCROLL AUDIT ===');
  console.log(JSON.stringify(scrollAudit, null, 2));
  
  // AUDIT: Check if pointer events are blocked by anything
  const pointerAudit = await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (!scroll) return 'no scroll';
    const rect = scroll.getBoundingClientRect();
    // Check what element is at the center of the scroll area
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const elementAtPoint = document.elementFromPoint(centerX, centerY);
    return {
      scrollRect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      elementAtCenter: elementAtPoint ? {
        tag: elementAtPoint.tagName,
        class: elementAtPoint.className?.substring(0, 80),
        id: elementAtPoint.id,
      } : null,
    };
  });
  console.log('\n=== POINTER AUDIT ===');
  console.log(JSON.stringify(pointerAudit, null, 2));
  
  // AUDIT: Check all z-index layers
  const zAudit = await page.evaluate(() => {
    const card = document.querySelector('.swipe-card.top-card');
    if (!card) return 'no card';
    const children = Array.from(card.children);
    return children.map(c => ({
      tag: c.tagName,
      class: c.className?.substring(0, 60),
      zIndex: getComputedStyle(c).zIndex,
      position: getComputedStyle(c).position,
      pointerEvents: getComputedStyle(c).pointerEvents,
      display: getComputedStyle(c).display,
      overflow: getComputedStyle(c).overflow,
      height: Math.round(c.getBoundingClientRect().height),
    }));
  });
  console.log('\n=== Z-INDEX LAYERS ===');
  console.log(JSON.stringify(zAudit, null, 2));
  
  console.log('\n=== ERRORS ===');
  errors.forEach(e => console.log('  ', e));
  
  await browser.close();
})();
