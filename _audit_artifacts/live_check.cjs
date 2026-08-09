const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Check page content to understand what's rendered
  const bodyText = await page.textContent('body');
  console.log('=== LOGIN PAGE CONTENT ===');
  console.log(bodyText.substring(0, 800));
  
  await page.screenshot({ path: 'live_login.png', fullPage: false });
  console.log('\nScreenshot saved: live_login.png');
  
  // Try to find email/password inputs
  const inputs = await page.$$('input');
  console.log('\nInputs found:', inputs.length);
  for (const inp of inputs) {
    const type = await inp.getAttribute('type');
    const placeholder = await inp.getAttribute('placeholder');
    console.log(`  type=${type} placeholder=${placeholder}`);
  }
  
  await browser.close();
})();
