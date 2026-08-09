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
  
  // ═══ SCREEN AUDIT ═══
  const screens = ['discover', 'feed', 'collab', 'matches', 'bts'];
  for (const s of screens) {
    await page.evaluate((screen) => {
      document.querySelectorAll('.nav-item').forEach(b => {
        if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === screen) b.click();
      });
    }, s);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `audit_${s}.png`, fullPage: false });
    const info = await page.evaluate(() => {
      const active = document.querySelector('.screen-el.active');
      if (!active) return { error: 'no active' };
      const cards = active.querySelectorAll('.swipe-card');
      const topCard = active.querySelector('.swipe-card.top-card');
      return {
        cardsCount: cards.length,
        hasTopCard: !!topCard,
        hasCardHero: !!active.querySelector('.card-hero'),
        hasCardInfoScroll: !!active.querySelector('.card-info-scroll'),
        hasNav: !!active.querySelector('.nav'),
        heroImgSrc: active.querySelector('.card-hero-img')?.src?.substring(0, 60) || 'none',
        first200: active.textContent.substring(0, 200),
      };
    });
    console.log(`${s}:`, JSON.stringify(info));
  }
  
  // ═══ PROFILE VIA HAMBURGER ═══
  console.log('\n═══ PROFILE VIA HAMBURGER ═══');
  // Open hamburger
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click();
    });
  });
  await page.waitForTimeout(1500);
  
  // Click Profile in hamburger menu
  await page.evaluate(() => {
    const items = document.querySelectorAll('.hamburger-item');
    items.forEach(item => {
      if (item.textContent.includes('Profile') && !item.textContent.includes('Edit')) item.click();
    });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'audit_hamburger_profile.png', fullPage: false });
  
  // Check hamburger sub-panel content
  const subpanel = await page.evaluate(() => {
    const panel = document.querySelector('.hamburger-panel');
    if (!panel) return { error: 'no panel' };
    return {
      hasEditProfile: panel.textContent.includes('Edit Profile'),
      hasMusePremium: panel.textContent.includes('Muse Premium') || panel.textContent.includes('$9.99'),
      hasStats: panel.textContent.includes('Statistics') || panel.textContent.includes('Matches'),
      panelText: panel.textContent.substring(0, 400),
    };
  });
  console.log('Profile sub-panel:', JSON.stringify(subpanel));
  
  // Click "Edit Profile" to navigate to actual profile screen
  await page.evaluate(() => {
    const items = document.querySelectorAll('.hamburger-item');
    items.forEach(item => {
      if (item.textContent.includes('Edit Profile')) item.click();
    });
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit_profile_screen.png', fullPage: false });
  
  // Check profile screen tabs
  const profileCheck = await page.evaluate(() => {
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
      hasPortfolio: text.includes('Portfolio') || text.includes('portfolio'),
      hasAvatar: !!active.querySelector('img'),
      hasName: text.includes('ARCANA'),
      first400: text.substring(0, 400),
    };
  });
  console.log('Profile screen:', JSON.stringify(profileCheck));
  
  // ═══ SETTINGS VIA HAMBURGER ═══
  console.log('\n═══ SETTINGS VIA HAMBURGER ═══');
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click();
    });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const items = document.querySelectorAll('.hamburger-item');
    items.forEach(item => {
      if (item.textContent.includes('Settings')) item.click();
    });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'audit_settings.png', fullPage: false });
  
  const settingsCheck = await page.evaluate(() => {
    const panel = document.querySelector('.hamburger-panel');
    if (!panel) return { error: 'no panel' };
    return {
      hasAccount: panel.textContent.includes('Account'),
      hasNotifications: panel.textContent.includes('Notifications'),
      hasSafety: panel.textContent.includes('Safety') || panel.textContent.includes('Privacy'),
      hasAppearance: panel.textContent.includes('Appearance') || panel.textContent.includes('Theme'),
      hasData: panel.textContent.includes('Data') || panel.textContent.includes('Export'),
      hasLogout: panel.textContent.includes('Log Out') || panel.textContent.includes('Logout'),
      panelText: panel.textContent.substring(0, 400),
    };
  });
  console.log('Settings:', JSON.stringify(settingsCheck));
  
  // ═══ MUSE PRO VIA HAMBURGER ═══
  console.log('\n═══ MUSE PRO VIA HAMBURGER ═══');
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click();
    });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const items = document.querySelectorAll('.hamburger-item');
    items.forEach(item => {
      if (item.textContent.includes('Muse Pro')) item.click();
    });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'audit_musepro.png', fullPage: false });
  
  const museproCheck = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    if (!active) return { error: 'no active' };
    const text = active.textContent;
    return {
      hasPro: text.includes('Pro') || text.includes('Premium'),
      hasPrice: text.includes('$9.99'),
      hasFeatures: text.includes('Unlimited') || text.includes('features'),
      hasUpgrade: text.includes('Upgrade') || text.includes('Subscribe'),
      first300: text.substring(0, 300),
    };
  });
  console.log('Muse Pro:', JSON.stringify(museproCheck));
  
  // ═══ CARD SCROLL INTERACTIVE ═══
  console.log('\n═══ CARD SCROLL ═══');
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'discover') b.click();
    });
  });
  await page.waitForTimeout(2000);
  
  const scrollTest = await page.evaluate(() => {
    const scroll = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (!scroll) return { error: 'no scroll' };
    const before = scroll.scrollTop;
    scroll.scrollTop = 300;
    return {
      beforeScroll: before,
      afterScroll: scroll.scrollTop,
      scrollHeight: scroll.scrollHeight,
      clientHeight: scroll.clientHeight,
      isScrollable: scroll.scrollHeight > scroll.clientHeight,
      actuallyScrolled: scroll.scrollTop > before,
    };
  });
  console.log('Scroll test:', JSON.stringify(scrollTest));
  await page.screenshot({ path: 'audit_card_scrolled.png', fullPage: false });
  
  // ═══ SUPERLIKE TEST ═══
  console.log('\n═══ SUPERLIKE ═══');
  const superlikeResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
    const superBtn = btns.find(b => {
      const t = b.textContent.trim();
      return t === '★' || t.includes('★ Super');
    });
    if (superBtn) {
      superBtn.click();
      return { clicked: true, text: superBtn.textContent.trim() };
    }
    return { clicked: false };
  });
  console.log('Superlike:', JSON.stringify(superlikeResult));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit_after_superlike.png', fullPage: false });
  
  // Check toast
  const toastAfterSuper = await page.evaluate(() => {
    const toast = document.querySelector('.toast');
    return toast ? toast.textContent : 'no toast';
  });
  console.log('Toast after superlike:', toastAfterSuper);
  
  // ═══ AURORA/STARS BACKGROUND ═══
  console.log('\n═══ AURORA/STARS ═══');
  const bgCheck = await page.evaluate(() => {
    const bg = document.querySelector('.bg-effects');
    const canvas = document.querySelector('canvas');
    const stars = document.querySelector('.stars');
    const aurora = document.querySelector('.aurora');
    const sparkles = document.querySelector('.sparkles');
    return {
      bgEffects: !!bg,
      canvas: !!canvas,
      stars: !!stars,
      aurora: !!aurora,
      sparkles: !!sparkles,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
  console.log('Background:', JSON.stringify(bgCheck));
  
  await browser.close();
  console.log('\n✅ All screenshots saved as audit_*.png');
})();
