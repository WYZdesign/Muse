const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  // Register fresh
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const ts = Date.now();
  await page.type('input[type="email"]', `fix${ts}@test.dev`, { delay: 10 });
  await page.type('input[type="password"]', 'TestPass!2026', { delay: 10 });
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(5000);
  
  // Skip onboard
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
  
  // ═══ TEST: MENU HAMBURGER ═══
  console.log('═══ TEST: HAMBURGER MENU ═══');
  
  // Click the last visible nav button (Menu)
  const menuClicked = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('.nav-item'));
    const visibleNav = navItems.filter(b => b.offsetParent !== null);
    const lastBtn = visibleNav[visibleNav.length - 1];
    if (lastBtn) {
      lastBtn.click();
      return { clicked: true, text: lastBtn.textContent.trim(), total: visibleNav.length };
    }
    return { clicked: false };
  });
  console.log('Menu button:', JSON.stringify(menuClicked));
  await page.waitForTimeout(2000);
  
  // Check if hamburger overlay appeared
  const hamburgerState = await page.evaluate(() => {
    const overlay = document.querySelector('.hamburger-overlay');
    const panel = document.querySelector('.hamburger-panel');
    const backdrop = document.querySelector('.hamburger-backdrop');
    const menuItems = document.querySelectorAll('.hamburger-item');
    return {
      overlayExists: !!overlay,
      overlayVisible: overlay ? overlay.offsetParent !== null || getComputedStyle(overlay).display !== 'none' : false,
      panelExists: !!panel,
      backdropExists: !!backdrop,
      menuItemCount: menuItems.length,
      menuTexts: Array.from(menuItems).map(m => m.textContent?.trim().substring(0, 30)),
    };
  });
  console.log('Hamburger state:', JSON.stringify(hamburgerState));
  await page.screenshot({ path: 'fix_01_menu.png', fullPage: false });
  
  // If hamburger didn't open, try clicking the Menu icon directly
  if (!hamburgerState.overlayExists || !hamburgerState.panelExists) {
    console.log('Hamburger did not open. Trying direct click on nav Menu button...');
    await page.evaluate(() => {
      // The hamburger button is the one with onHamburgerToggle
      const navItems = Array.from(document.querySelectorAll('.nav-item'));
      const menuBtn = navItems.filter(b => b.offsetParent !== null).pop();
      if (menuBtn) {
        // Force click via dispatchEvent
        menuBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        menuBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await page.waitForTimeout(2000);
    const retryState = await page.evaluate(() => ({
      overlay: !!document.querySelector('.hamburger-overlay'),
      panel: !!document.querySelector('.hamburger-panel'),
    }));
    console.log('After retry:', JSON.stringify(retryState));
    await page.screenshot({ path: 'fix_01b_menu_retry.png', fullPage: false });
  }
  
  // If hamburger is open, check menu items
  if (hamburgerState.overlayExists || hamburgerState.panelExists) {
    console.log('Menu items:', JSON.stringify(hamburgerState.menuTexts));
    
    // Check for Muse Pro
    const hasMusePro = await page.evaluate(() => {
      const panel = document.querySelector('.hamburger-panel');
      return panel ? panel.textContent.includes('Muse Pro') : false;
    });
    console.log('Has Muse Pro:', hasMusePro);
    
    // Click Profile from hamburger
    const profileClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.hamburger-item'));
      const profileBtn = btns.find(b => b.textContent.includes('Profile'));
      if (profileBtn) { profileBtn.click(); return true; }
      return false;
    });
    console.log('Profile clicked:', profileClicked);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'fix_02_profile.png', fullPage: false });
    
    // Check profile tabs
    const profileTabs = await page.evaluate(() => {
      const active = document.querySelector('.screen-el.active');
      if (!active) return { error: 'no active screen' };
      const text = active.textContent;
      return {
        hasAll: text.includes('All'),
        hasPortrait: text.includes('Portrait'),
        hasLandscape: text.includes('Landscape'),
        hasSets: text.includes('Sets'),
        hasManageAlbums: text.includes('Manage Albums'),
        hasEditProfile: text.includes('Edit Profile'),
        first300: text.substring(0, 300),
      };
    });
    console.log('Profile tabs:', JSON.stringify(profileTabs));
  }
  
  // ═══ TEST: CARD SCROLL INTERACTIVE ═══
  console.log('\n═══ TEST: CARD SCROLL ═══');
  // Go back to discover
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim() === 'Discover') b.click();
    });
  });
  await page.waitForTimeout(2000);
  
  // Check card-info-scroll is scrollable
  const scrollTest = await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (!scroll) return { error: 'no scroll' };
    scroll.scrollTop = 200;
    return {
      beforeScroll: scroll.scrollTop,
      scrollHeight: scroll.scrollHeight,
      clientHeight: scroll.clientHeight,
      isScrollable: scroll.scrollHeight > scroll.clientHeight,
    };
  });
  console.log('Scroll test:', JSON.stringify(scrollTest));
  await page.screenshot({ path: 'fix_03_card_scrolled.png', fullPage: false });
  
  await browser.close();
})();
