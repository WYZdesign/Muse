const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const ts = Date.now();
  await page.fill('input[type="email"]', `audit${ts}@test.dev`);
  await page.fill('input[type="password"]', 'TestPass!2026');
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(5000);

  // Fixed skip logic — handle "Skip — Set Up Later" and other variants
  for (let i = 0; i < 30; i++) {
    const r = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
      const find = (fn) => btns.find(fn);
      
      const enter = find(b => b.textContent.trim() === 'Enter Muse');
      if (enter) { enter.click(); return 'enter'; }
      
      const skip = find(b => b.textContent.trim().toLowerCase().includes('skip'));
      if (skip) { skip.click(); return 'skip'; }
      
      const next = find(b => b.textContent.trim() === '→' || b.textContent.trim() === 'Next');
      if (next) { next.click(); return 'next'; }
      
      const start = find(b => b.textContent.trim() === 'Get Started');
      if (start) { start.click(); return 'start'; }
      
      return 'none';
    });
    if (r === 'enter') { console.log(`Step ${i}: ENTER MUSE`); break; }
    console.log(`Step ${i}: ${r}`);
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(3000);

  // Verify we're in the app
  const appState = await page.evaluate(() => ({
    hasNav: !!document.querySelector('.nav'),
    bodySnippet: document.body.textContent.substring(0, 100).replace(/\s+/g,' ').trim(),
  }));
  console.log('\nApp state:', JSON.stringify(appState));

  // ═══ BACKGROUND ═══
  console.log('\n═══ BACKGROUND ═══');
  const bg = await page.evaluate(() => ({
    starField: !!document.querySelector('.star-field'),
    starCount: document.querySelectorAll('.star').length,
    aurora: document.querySelectorAll('.aurora-strip').length,
    nebula: document.querySelectorAll('.nebula-fog').length,
    cometCanvas: !!document.querySelector('.comet-field'),
    sparkleField: !!document.querySelector('.sparkle-field'),
    sparkleCount: document.querySelectorAll('.sparkle-particle').length,
    emberField: !!document.querySelector('.ember-field'),
    sceneOrbs: document.querySelectorAll('.scene-orb').length,
  }));
  console.log(JSON.stringify(bg));

  // ═══ DISCOVER ═══
  console.log('\n═══ DISCOVER ═══');
  const discover = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    if (!el) return 'no active';
    return {
      cards: el.querySelectorAll('.swipe-card').length,
      hasTopCard: !!el.querySelector('.swipe-card.top-card'),
      hasCardHero: !!el.querySelector('.card-hero'),
      hasCardInfoScroll: !!el.querySelector('.card-info-scroll'),
      hasNav: !!el.querySelector('.nav'),
      snippet: el.textContent.substring(0, 120).replace(/\s+/g,' ').trim(),
    };
  });
  console.log(JSON.stringify(discover));
  await page.screenshot({ path: 'audit2_discover.png' });

  // ═══ FEED ═══
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'feed') b.click(); }));
  await page.waitForTimeout(1500);
  const feed = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    return el ? el.textContent.substring(0, 150).replace(/\s+/g,' ').trim() : 'no active';
  });
  console.log('\nFeed:', feed);
  await page.screenshot({ path: 'audit2_feed.png' });

  // ═══ COLLAB ═══
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'collab') b.click(); }));
  await page.waitForTimeout(1500);
  const collab = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    return el ? el.textContent.substring(0, 150).replace(/\s+/g,' ').trim() : 'no active';
  });
  console.log('Collab:', collab);
  await page.screenshot({ path: 'audit2_collab.png' });

  // ═══ MATCHES ═══
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'matches') b.click(); }));
  await page.waitForTimeout(1500);
  const matches = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    return el ? el.textContent.substring(0, 150).replace(/\s+/g,' ').trim() : 'no active';
  });
  console.log('Matches:', matches);
  await page.screenshot({ path: 'audit2_matches.png' });

  // ═══ BTS ═══
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'bts') b.click(); }));
  await page.waitForTimeout(1500);
  const bts = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    return el ? el.textContent.substring(0, 150).replace(/\s+/g,' ').trim() : 'no active';
  });
  console.log('BTS:', bts);
  await page.screenshot({ path: 'audit2_bts.png' });

  // ═══ CARD SCROLL ═══
  console.log('\n═══ CARD SCROLL ═══');
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'discover') b.click(); }));
  await page.waitForTimeout(1500);
  const scroll = await page.evaluate(() => {
    const s = document.querySelector('.swipe-card.top-card .card-info-scroll');
    if (!s) return 'no scroll';
    s.scrollTop = 300;
    return { scrollHeight: s.scrollHeight, clientHeight: s.clientHeight, scrollable: s.scrollHeight > s.clientHeight, scrolledTo: s.scrollTop };
  });
  console.log(JSON.stringify(scroll));
  await page.screenshot({ path: 'audit2_scrolled.png' });

  // ═══ SUPERLIKE ═══
  console.log('\n═══ SUPERLIKE ═══');
  const superRes = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
    const btn = btns.find(b => b.textContent.trim().includes('★'));
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return 'not found';
  });
  console.log('Clicked:', superRes);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit2_superlike.png' });

  // ═══ HAMBURGER ═══
  console.log('\n═══ HAMBURGER ═══');
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'discover') b.click(); }));
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click(); }));
  await page.waitForTimeout(1500);
  const hamItems = await page.evaluate(() => {
    const panel = document.querySelector('.hamburger-panel');
    if (!panel) return 'no panel';
    const labels = panel.querySelectorAll('.hamburger-item-label');
    return Array.from(labels).map(l => l.textContent.trim());
  });
  console.log('Hamburger items:', JSON.stringify(hamItems));
  await page.screenshot({ path: 'audit2_hamburger.png' });

  // ═══ PROFILE VIA HAMBURGER ═══
  console.log('\n═══ PROFILE ═══');
  // Click Profile label inside hamburger
  await page.evaluate(() => {
    const labels = document.querySelectorAll('.hamburger-item-label');
    labels.forEach(l => { if (l.textContent.trim() === 'Profile') l.closest('.hamburger-item')?.click(); });
  });
  await page.waitForTimeout(1500);
  
  // Check sub-panel
  const profPanel = await page.evaluate(() => {
    const panel = document.querySelector('.hamburger-panel');
    if (!panel) return 'no panel';
    const labels = panel.querySelectorAll('.hamburger-item-label');
    return { labels: Array.from(labels).map(l => l.textContent.trim()), text: panel.textContent.substring(0, 200).replace(/\s+/g,' ').trim() };
  });
  console.log('Profile sub-panel:', JSON.stringify(profPanel));
  
  // Click Edit Profile to navigate to profile screen
  await page.evaluate(() => {
    const labels = document.querySelectorAll('.hamburger-item-label');
    labels.forEach(l => { if (l.textContent.trim() === 'Edit Profile') l.closest('.hamburger-item')?.click(); });
  });
  await page.waitForTimeout(2000);
  
  const profileScreen = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    if (!el) return 'no active screen';
    const text = el.textContent;
    return {
      hasProfileCompleteness: text.includes('Profile Completeness'),
      hasPortfolio: text.includes('Portfolio'),
      hasAllTab: text.includes(' All '),
      hasPortraitTab: text.includes('Portrait'),
      hasLandscapeTab: text.includes('Landscape'),
      hasSetsTab: text.includes('Sets'),
      hasAbout: text.includes('About'),
      hasBadges: text.includes('Badges'),
      hasSubscription: text.includes('Subscription'),
      hasSelfDiscovery: text.includes('Self Discovery'),
      first300: text.substring(0, 300).replace(/\s+/g,' ').trim(),
    };
  });
  console.log('Profile screen:', JSON.stringify(profileScreen));
  await page.screenshot({ path: 'audit2_profile.png' });

  // ═══ SUBSCRIPTION ═══
  console.log('\n═══ SUBSCRIPTION ═══');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
    const upgrade = btns.find(b => b.textContent.trim() === 'Upgrade');
    if (upgrade) upgrade.click();
  });
  await page.waitForTimeout(2000);
  const sub = await page.evaluate(() => ({
    hasUnlock: document.body.textContent.includes('Unlock Your Potential'),
    hasTierCard: !!document.querySelector('.tier-card'),
    hasMusePro: !!document.querySelector('.tier-name'),
    hasCheckoutBtn: !!document.querySelector('.tier-btn'),
  }));
  console.log(JSON.stringify(sub));
  await page.screenshot({ path: 'audit2_subscription.png' });

  // ═══ SETTINGS VIA HAMBURGER ═══
  console.log('\n═══ SETTINGS ═══');
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click(); }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const labels = document.querySelectorAll('.hamburger-item-label');
    labels.forEach(l => { if (l.textContent.trim() === 'Settings') l.closest('.hamburger-item')?.click(); });
  });
  await page.waitForTimeout(1500);
  const settingsItems = await page.evaluate(() => {
    const panel = document.querySelector('.hamburger-panel');
    if (!panel) return 'no panel';
    return panel.textContent.substring(0, 300).replace(/\s+/g,' ').trim();
  });
  console.log(settingsItems);
  await page.screenshot({ path: 'audit2_settings.png' });

  // ═══ MUSE PRO ═══
  console.log('\n═══ MUSE PRO ═══');
  await page.evaluate(() => document.querySelectorAll('.nav-item').forEach(b => { if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click(); }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const labels = document.querySelectorAll('.hamburger-item-label');
    labels.forEach(l => { if (l.textContent.trim() === 'Muse Pro') l.closest('.hamburger-item')?.click(); });
  });
  await page.waitForTimeout(2000);
  const musePro = await page.evaluate(() => ({
    hasUnlock: document.body.textContent.includes('Unlock Your Potential'),
    hasTierCard: !!document.querySelector('.tier-card'),
  }));
  console.log(JSON.stringify(musePro));
  await page.screenshot({ path: 'audit2_musepro.png' });

  await browser.close();
  console.log('\n✅ All done');
})();
