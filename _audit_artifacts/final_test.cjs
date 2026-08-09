const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const ts = Date.now();
  await page.type('input[type="email"]', `final${ts}@test.dev`, { delay: 10 });
  await page.type('input[type="password"]', 'TestPass!2026', { delay: 10 });
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(5000);
  
  for (let i = 0; i < 25; i++) {
    const r = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
      const find = (t) => btns.find(b => b.textContent.trim().includes(t));
      const skip = find('Skip'); if (skip) { skip.click(); return 'skip'; }
      const next = find('→'); if (next) { next.click(); return 'next'; }
      const enter = find('Enter Muse'); if (enter) { enter.click(); return 'enter'; }
      return 'none';
    });
    if (r === 'enter') break;
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(3000);

  // ═══ 1. BACKGROUND CHECK ═══
  console.log('═══ 1. BACKGROUND ═══');
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

  // ═══ 2. ALL NAV SCREENS ═══
  console.log('\n═══ 2. NAV SCREENS ═══');
  const navTargets = ['discover','feed','collab','matches','bts'];
  for (const t of navTargets) {
    await page.evaluate((s) => {
      document.querySelectorAll('.nav-item').forEach(b => {
        if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === s) b.click();
      });
    }, t);
    await page.waitForTimeout(1500);
    const active = await page.evaluate(() => {
      const el = document.querySelector('.screen-el.active');
      return el ? el.textContent.substring(0, 120).replace(/\s+/g,' ').trim() : 'NO ACTIVE';
    });
    console.log(`${t}: ${active}`);
  }

  // ═══ 3. HAMBURGER → PROFILE FLOW ═══
  console.log('\n═══ 3. HAMBURGER → PROFILE ═══');
  // Go to discover first
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'discover') b.click();
    });
  });
  await page.waitForTimeout(1000);
  
  // Open hamburger via Menu button
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click();
    });
  });
  await page.waitForTimeout(1500);
  
  // Check hamburger is open
  const hamOpen = await page.evaluate(() => !!document.querySelector('.hamburger-panel'));
  console.log('Hamburger open:', hamOpen);
  
  // Click the hamburger-item whose label is "Profile" (not "Edit Profile")
  await page.evaluate(() => {
    const labels = document.querySelectorAll('.hamburger-item-label');
    labels.forEach(l => {
      if (l.textContent.trim() === 'Profile') {
        l.closest('.hamburger-item')?.click();
      }
    });
  });
  await page.waitForTimeout(1500);
  
  // Check if we're in the profile sub-panel
  const subPanel = await page.evaluate(() => {
    const panel = document.querySelector('.hamburger-panel');
    if (!panel) return 'no panel';
    return panel.textContent.substring(0, 200).replace(/\s+/g,' ').trim();
  });
  console.log('After Profile click:', subPanel);
  
  // Now click "Edit Profile" button inside the sub-panel
  await page.evaluate(() => {
    const labels = document.querySelectorAll('.hamburger-item-label');
    labels.forEach(l => {
      if (l.textContent.trim() === 'Edit Profile') {
        l.closest('.hamburger-item')?.click();
      }
    });
  });
  await page.waitForTimeout(2000);
  
  // Check if profile screen is now active
  const profileActive = await page.evaluate(() => {
    const el = document.querySelector('.screen-el.active');
    if (!el) return { screen: 'none' };
    const text = el.textContent;
    return {
      hasProfileCompleteness: text.includes('Profile Completeness'),
      hasPortfolio: text.includes('Portfolio'),
      hasAllTab: text.includes('All'),
      hasPortraitTab: text.includes('Portrait'),
      hasLandscapeTab: text.includes('Landscape'),
      hasSetsTab: text.includes('Sets'),
      hasAbout: text.includes('About'),
      hasBadges: text.includes('Badges'),
      hasReferral: text.includes('Referral'),
      hasSelfDiscovery: text.includes('Self Discovery'),
      hasSubscription: text.includes('Subscription'),
      first200: text.substring(0, 200).replace(/\s+/g,' ').trim(),
    };
  });
  console.log('Profile screen:', JSON.stringify(profileActive));
  await page.screenshot({ path: 'final_profile.png', fullPage: false });

  // ═══ 4. SUBSCRIPTION SCREEN ═══
  console.log('\n═══ 4. SUBSCRIPTION ═══');
  // Navigate to subscription from profile
  await page.evaluate(() => {
    // Click Upgrade button on profile
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
    const upgrade = btns.find(b => b.textContent.trim() === 'Upgrade');
    if (upgrade) upgrade.click();
  });
  await page.waitForTimeout(2000);
  const subCheck = await page.evaluate(() => {
    // Subscription is a direct render, not screen-el
    const text = document.body.textContent;
    return {
      hasUnlock: text.includes('Unlock Your Potential'),
      hasTierCard: !!document.querySelector('.tier-card'),
      hasFree: text.includes('Free Plan'),
      hasMusePro: text.includes('Muse Pro'),
      hasPrice999: text.includes('$9.99'),
    };
  });
  console.log('Subscription:', JSON.stringify(subCheck));
  await page.screenshot({ path: 'final_subscription.png', fullPage: false });

  // ═══ 5. SETTINGS SCREEN ═══
  console.log('\n═══ 5. SETTINGS ═══');
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click();
    });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const labels = document.querySelectorAll('.hamburger-item-label');
    labels.forEach(l => {
      if (l.textContent.trim() === 'Settings') l.closest('.hamburger-item')?.click();
    });
  });
  await page.waitForTimeout(1500);
  const settingsPanel = await page.evaluate(() => {
    const panel = document.querySelector('.hamburger-panel');
    if (!panel) return 'no panel';
    return panel.textContent.substring(0, 300).replace(/\s+/g,' ').trim();
  });
  console.log('Settings:', settingsPanel);
  await page.screenshot({ path: 'final_settings.png', fullPage: false });

  // ═══ 6. COMMUNITY / SESSIONS / NETWORK ═══
  console.log('\n═══ 6. HAMBURGER SUB-SCREENS ═══');
  for (const item of ['Community', 'Sessions', 'Network']) {
    await page.evaluate(() => {
      document.querySelectorAll('.nav-item').forEach(b => {
        if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click();
      });
    });
    await page.waitForTimeout(1000);
    await page.evaluate((label) => {
      const labels = document.querySelectorAll('.hamburger-item-label');
      labels.forEach(l => {
        if (l.textContent.trim() === label) l.closest('.hamburger-item')?.click();
      });
    }, item);
    await page.waitForTimeout(1500);
    const content = await page.evaluate(() => {
      const panel = document.querySelector('.hamburger-panel');
      if (!panel) return 'no panel';
      return panel.textContent.substring(0, 150).replace(/\s+/g,' ').trim();
    });
    console.log(`${item}: ${content}`);
    // Go back
    await page.evaluate(() => {
      const back = document.querySelector('.hamburger-back');
      if (back) back.click();
    });
    await page.waitForTimeout(500);
  }

  // ═══ 7. MUSE PRO HAMBURGER ═══
  console.log('\n═══ 7. MUSE PRO ═══');
  await page.evaluate(() => {
    document.querySelectorAll('.nav-item').forEach(b => {
      if (b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'menu') b.click();
    });
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const labels = document.querySelectorAll('.hamburger-item-label');
    labels.forEach(l => {
      if (l.textContent.trim() === 'Muse Pro') l.closest('.hamburger-item')?.click();
    });
  });
  await page.waitForTimeout(2000);
  // Muse Pro calls showScreen("subscription") which should render subscription screen
  const musePro = await page.evaluate(() => ({
    hasUnlock: document.body.textContent.includes('Unlock Your Potential'),
    hasTierCard: !!document.querySelector('.tier-card'),
  }));
  console.log('Muse Pro → Subscription:', JSON.stringify(musePro));
  await page.screenshot({ path: 'final_musepro.png', fullPage: false });

  await browser.close();
  console.log('\n✅ Done');
})();
