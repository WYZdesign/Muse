const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  try {
    await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // Login
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button.auth-tab')).find(t => t.textContent.trim() === 'Log In')?.click();
    });
    await page.waitForTimeout(500);
    await page.click('input[type=email]');
    await page.fill('input[type=email]', 'torree.marcel@gmail.com');
    await page.click('input[type=password]');
    await page.fill('input[type=password]', 'Torye91?!');
    await page.waitForTimeout(300);
    await page.click('.btn.btn-gold');
    await page.waitForTimeout(10000);

    // Dismiss modals
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,div,a,span')).find(e => e.textContent.trim() === 'Later')?.click();
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      document.querySelectorAll('[class*=close], [aria-label*=Close]').forEach(b => b.click());
    });
    await page.waitForTimeout(1000);

    // Dark theme screenshot
    await page.screenshot({ path: 'V:\\Muse\\_screenshots\\theme-dark.png' });
    console.log('Saved theme-dark.png');

    // Switch to sunrise via localStorage + reload
    await page.evaluate(() => {
      localStorage.setItem('muse_theme', 'sunrise');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    // Dismiss modals again
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,div,a,span')).find(e => e.textContent.trim() === 'Later')?.click();
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      document.querySelectorAll('[class*=close], [aria-label*=Close]').forEach(b => b.click());
    });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'V:\\Muse\\_screenshots\\theme-sunrise.png' });
    console.log('Saved theme-sunrise.png');

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'V:\\Muse\\_screenshots\\error.png' });
  }
  await browser.close();
})();
