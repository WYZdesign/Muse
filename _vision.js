const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:\\Users\\torre\\AppData\\Local\\Temp\\opencode';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const url = 'https://muse.wyzdesign.com/muse';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // Splash appears for ~3s
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, 'v_splash.png') });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(OUT, 'v_after_splash.png') });

    // Try to find light theme by setting data-theme on <html> and capture auth
    for (const th of ['sunrise', 'daylight', 'sky', 'rose']) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), th);
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, 'v_auth_' + th + '.png') });
    }
    // Dark default
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, 'v_auth_default.png') });

    // Log any console errors
    console.log('DONE');
  } catch (e) {
    console.log('ERR:' + e.message);
  }
  await browser.close();
})();
