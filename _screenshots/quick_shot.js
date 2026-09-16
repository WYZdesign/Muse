const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  try {
    await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Login
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button.auth-tab')).find(t => t.textContent.trim() === 'Log In')?.click();
    });
    await page.waitForTimeout(500);
    await page.fill('input[type=email]', 'torree.marcel@gmail.com');
    await page.fill('input[type=password]', 'Torye91?!');
    await page.evaluate(() => {
      const btn = document.querySelector('.btn.btn-gold');
      if (btn) btn.click();
    });
    await page.waitForTimeout(10000);

    // Dismiss popups
    await page.evaluate(() => {
      document.querySelectorAll('button,div,a,span').forEach(e => {
        if (e.textContent.trim() === 'Later' || e.getAttribute('aria-label')?.includes('Close')) e.click();
      });
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'V:\\Muse\\_screenshots\\dark-discover.png' });
    console.log('OK');
  } catch (e) {
    console.error(e.message);
  }
  await browser.close();
})();
