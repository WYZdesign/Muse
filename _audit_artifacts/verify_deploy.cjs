const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  // Capture all JS URLs
  const jsUrls = [];
  page.on('response', res => {
    if (res.url().includes('.js') && res.url().includes('_next')) {
      jsUrls.push(res.url());
    }
  });
  
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  console.log('=== JS BUNDLES SERVED ===');
  jsUrls.forEach(u => console.log(u));
  
  // Fetch main page HTML and check for our changes
  const html = await page.content();
  
  // Check for key signatures of our code
  const checks = [
    { name: 'card-actions-row', found: html.includes('card-actions-row') },
    { name: 'btn-super', found: html.includes('btn-super') },
    { name: 'card-action-btn', found: html.includes('card-action-btn') },
    { name: 'Muse Pro', found: html.includes('Muse Pro') },
    { name: 'Manage Albums', found: html.includes('Manage Albums') },
    { name: 'VALID_SCREENS', found: html.includes('VALID_SCREENS') },
    { name: 'muse_loaded', found: html.includes('muse_loaded') },
    { name: 'sessionStorage', found: html.includes('sessionStorage') },
    { name: 'portrait-only filter', found: html.includes('PORTRAIT_IMG') },
    { name: 'card-hero-name shadow', found: html.includes('card-hero-name') },
  ];
  
  console.log('\n=== DEPLOYED CODE CHECKS ===');
  checks.forEach(c => console.log(`${c.found ? '✅' : '❌'} ${c.name}`));
  
  // Check the actual page for login screen
  const bodyText = await page.textContent('body');
  console.log('\n=== PAGE CONTENT (first 300) ===');
  console.log(bodyText.substring(0, 300));
  
  // Check page title
  console.log('\nTitle:', await page.title());
  console.log('URL:', page.url());
  
  await browser.close();
})();
