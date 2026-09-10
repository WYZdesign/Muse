const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const dir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const EMAIL = 'torree.marcel@gmail.com';
const PASS = 'Torye91?!';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  for (const theme of ['sunset','moonlight','daylight','rose']) {
    const page = await ctx.newPage();
    await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Set theme
    await page.evaluate((t) => {
      localStorage.setItem('muse-theme', t);
      document.documentElement.setAttribute('data-theme', t);
    }, theme);

    // Log in
    try {
      const loginTab = page.locator('text=Log In').first();
      if (await loginTab.isVisible({ timeout: 3000 })) await loginTab.click();
      await page.waitForTimeout(500);
      const emailInput = page.locator('input[placeholder="Email"]').first();
      if (await emailInput.isVisible({ timeout: 3000 })) await emailInput.fill(EMAIL);
      const passInput = page.locator('input[placeholder="Password"]').first();
      if (await passInput.isVisible({ timeout: 3000 })) await passInput.fill(PASS);
      const loginBtn = page.locator('button:has-text("Log In")').last();
      await loginBtn.click();
      await page.waitForTimeout(6000);
      console.log('Logged in for ' + theme);
    } catch (e) {
      console.log('Login failed: ' + e.message);
      await page.close();
      continue;
    }

    // Dismiss streak modal — click "Later"
    try {
      const later = page.locator('text=Later').first();
      if (await later.isVisible({ timeout: 4000 })) {
        await later.click();
        await page.waitForTimeout(1000);
        console.log('  Dismissed streak modal');
      }
    } catch (e) {}

    // Dismiss any other modals/overlays
    try {
      const closeButtons = page.locator('button[aria-label="Close"], button[aria-label="Back"], .modal-back');
      for (let i = 0; i < 3; i++) {
        const btn = closeButtons.first();
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          await page.waitForTimeout(500);
        }
      }
    } catch (e) {}

    // Capture main discover screen (default)
    await page.screenshot({ path: path.join(dir, theme + '-01-discover.png'), fullPage: false });
    console.log('  ' + theme + '-01-discover');

    // Navigate to each screen by clicking nav items
    const navScreens = [
      ['Feed', 'feed'],
      ['Muses', 'matches'],
      ['Network', 'network'],
      ['Profile', 'profile'],
    ];

    for (const [label, name] of navScreens) {
      try {
        const navBtn = page.locator(`text=${label}`).first();
        if (await navBtn.isVisible({ timeout: 2000 })) {
          await navBtn.click();
          await page.waitForTimeout(2000);
          // Dismiss any modal that pops up
          try {
            const later2 = page.locator('text=Later').first();
            if (await later2.isVisible({ timeout: 1000 })) await later2.click();
          } catch (e) {}
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(dir, theme + '-' + name + '.png'), fullPage: false });
          console.log('  ' + theme + '-' + name);
        }
      } catch (e) {
        console.log('  skip ' + name);
      }
    }

    // Navigate to Settings via Profile > hamburger or settings icon
    try {
      // Try hamburger menu
      const hamburger = page.locator('button[aria-label="Menu"], .hamburger-btn, [class*=hamburger]').first();
      if (await hamburger.isVisible({ timeout: 2000 })) {
        await hamburger.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(dir, theme + '-05-menu.png'), fullPage: false });
        console.log('  ' + theme + '-05-menu');

        // Click Settings in menu
        const settingsLink = page.locator('text=Settings').first();
        if (await settingsLink.isVisible({ timeout: 2000 })) {
          await settingsLink.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: path.join(dir, theme + '-06-settings.png'), fullPage: false });
          console.log('  ' + theme + '-06-settings');
        }

        // Go back
        const backBtn = page.locator('.modal-back, button[aria-label="Back"]').first();
        if (await backBtn.isVisible({ timeout: 1000 })) await backBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log('  skip menu/settings');
    }

    // Navigate to Community
    try {
      const discoverNav = page.locator('text=Discover').first();
      if (await discoverNav.isVisible({ timeout: 1000 })) await discoverNav.click();
      await page.waitForTimeout(1000);
      // Community is via conn-tab on Discover or Network
      const commTab = page.locator('text=Community').first();
      if (await commTab.isVisible({ timeout: 2000 })) {
        await commTab.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(dir, theme + '-07-community.png'), fullPage: false });
        console.log('  ' + theme + '-07-community');
      }
    } catch (e) {}

    // Sessions
    try {
      const sessTab = page.locator('text=Sessions').first();
      if (await sessTab.isVisible({ timeout: 2000 })) {
        await sessTab.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(dir, theme + '-08-sessions.png'), fullPage: false });
        console.log('  ' + theme + '-08-sessions');
      }
    } catch (e) {}

    // BTS
    try {
      const btsTab = page.locator('text=BTS').first();
      if (await btsTab.isVisible({ timeout: 2000 })) {
        await btsTab.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(dir, theme + '-09-bts.png'), fullPage: false });
        console.log('  ' + theme + '-09-bts');
      }
    } catch (e) {}

    // Quests
    try {
      const questBtn = page.locator('text=Quests').first();
      if (await questBtn.isVisible({ timeout: 2000 })) {
        await questBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(dir, theme + '-10-quests.png'), fullPage: false });
        console.log('  ' + theme + '-10-quests');
      }
    } catch (e) {}

    await page.close();
  }
  await browser.close();
  console.log('All done');
})();
