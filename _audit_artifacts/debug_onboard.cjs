const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  
  await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Check what's on screen first
  const initialState = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
    return {
      hasEmailInput: !!document.querySelector('input[type="email"]'),
      hasPasswordInput: !!document.querySelector('input[type="password"]'),
      visibleBtns: btns.map(b => b.textContent.trim()).filter(t => t.length < 40),
    };
  });
  console.log('Initial:', JSON.stringify(initialState));
  
  // Register
  const ts = Date.now();
  await page.fill('input[type="email"]', `debug${ts}@test.dev`);
  await page.fill('input[type="password"]', 'TestPass!2026');
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(5000);
  
  // Check what we see now
  const afterRegister = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
    const active = document.querySelector('.screen-el.active');
    return {
      visibleBtns: btns.map(b => b.textContent.trim()).filter(t => t.length < 40),
      activeScreen: active ? active.textContent.substring(0, 100).replace(/\s+/g,' ').trim() : 'none',
      hasOnboard: !!document.querySelector('[class*="onboard"]'),
      bodyText: document.body.textContent.substring(0, 200).replace(/\s+/g,' ').trim(),
    };
  });
  console.log('After register:', JSON.stringify(afterRegister));
  
  // Try clicking each visible button and see what happens
  for (let i = 0; i < 30; i++) {
    const result = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
      const texts = btns.map(b => b.textContent.trim());
      
      // Try Skip first
      const skip = btns.find(b => b.textContent.trim() === 'Skip');
      if (skip) { skip.click(); return { action: 'skip', btns: texts.filter(t=>t.length<30) }; }
      
      // Try →
      const arrow = btns.find(b => b.textContent.trim() === '→');
      if (arrow) { arrow.click(); return { action: 'next', btns: texts.filter(t=>t.length<30) }; }
      
      // Try Next
      const next = btns.find(b => b.textContent.trim() === 'Next');
      if (next) { next.click(); return { action: 'next', btns: texts.filter(t=>t.length<30) }; }
      
      // Try Enter Muse
      const enter = btns.find(b => b.textContent.trim() === 'Enter Muse');
      if (enter) { enter.click(); return { action: 'enter', btns: texts.filter(t=>t.length<30) }; }
      
      // Try Get Started
      const start = btns.find(b => b.textContent.trim() === 'Get Started');
      if (start) { start.click(); return { action: 'start', btns: texts.filter(t=>t.length<30) }; }
      
      return { action: 'none', btns: texts.filter(t=>t.length<30) };
    });
    console.log(`Step ${i}: ${result.action} — btns: [${result.btns.join(', ')}]`);
    if (result.action === 'enter') break;
    await page.waitForTimeout(1500);
  }
  
  await page.waitForTimeout(2000);
  
  // Final state
  const final = await page.evaluate(() => {
    const active = document.querySelector('.screen-el.active');
    return {
      activeScreen: active ? active.textContent.substring(0, 150).replace(/\s+/g,' ').trim() : 'none',
      hasNav: !!document.querySelector('.nav'),
      bodyText: document.body.textContent.substring(0, 200).replace(/\s+/g,' ').trim(),
    };
  });
  console.log('Final:', JSON.stringify(final));
  await page.screenshot({ path: 'debug_final.png', fullPage: false });
  
  await browser.close();
})();
