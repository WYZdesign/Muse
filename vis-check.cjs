const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://muse.wyzdesign.com';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-landing.png'), fullPage: false });
    console.log('1/5 Landing page captured');
  } catch (e) {
    console.error('Landing failed:', e.message);
  }
  
  try {
    await page.goto(`${BASE_URL}/muse`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-muse-app.png'), fullPage: false });
    console.log('2/5 Muse app captured');
  } catch (e) {
    console.error('Muse app failed:', e.message);
  }
  
  try {
    await page.goto(`${BASE_URL}/muse`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const discoverBtn = page.locator('button:has-text("Discover")').first();
    if (await discoverBtn.isVisible().catch(() => false)) {
      await discoverBtn.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-discover.png'), fullPage: false });
    console.log('3/5 Discover screen captured');
  } catch (e) {
    console.error('Discover failed:', e.message);
  }
  
  try {
    const feedBtn = page.locator('button:has-text("Feed")').first();
    if (await feedBtn.isVisible().catch(() => false)) {
      await feedBtn.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-feed.png'), fullPage: false });
    console.log('4/5 Feed screen captured');
  } catch (e) {
    console.error('Feed failed:', e.message);
  }
  
  try {
    const menuBtn = page.locator('button:has-text("Menu")').first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-menu.png'), fullPage: false });
    console.log('5/5 Menu captured');
  } catch (e) {
    console.error('Menu failed:', e.message);
  }
  
  await context.close();
  await browser.close();
  console.log('All screenshots saved to', SCREENSHOT_DIR);
})();
