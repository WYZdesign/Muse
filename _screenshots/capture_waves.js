const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();
  try {
    await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // Click login tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button.auth-tab'));
      tabs.find(t => t.textContent.trim() === 'Log In')?.click();
    });
    await page.waitForTimeout(500);

    // Fill credentials
    await page.click('input[type=email]');
    await page.fill('input[type=email]', 'torree.marcel@gmail.com');
    await page.click('input[type=password]');
    await page.fill('input[type=password]', 'Torye91?!');
    await page.waitForTimeout(300);

    // Click submit
    await page.click('.btn.btn-gold');
    await page.waitForTimeout(8000);

    // Dismiss streak modal if present
    await page.evaluate(() => {
      const later = Array.from(document.querySelectorAll('button,div,a,span')).find(e => e.textContent.trim() === 'Later');
      if (later) later.click();
    });
    await page.waitForTimeout(2000);

    // Dismiss any other modals/popups
    await page.evaluate(() => {
      const closeButtons = document.querySelectorAll('[class*=close], [aria-label*=Close], [class*=dismiss]');
      closeButtons.forEach(b => b.click());
    });
    await page.waitForTimeout(1000);

    // Screenshot the discover screen
    await page.screenshot({ path: 'V:\\Muse\\_screenshots\\discover-screen.png' });
    console.log('Saved discover-screen.png');

    // Scroll the active screen to the bottom to trigger waves
    const scrollResult = await page.evaluate(() => {
      // Find the active screen element and scroll it
      const screens = document.querySelectorAll('.screen-el');
      let activeScreen = null;
      screens.forEach(s => { if (s.classList.contains('active')) activeScreen = s; });
      if (!activeScreen) {
        // Try the discover screen's scroll container
        const connScroll = document.querySelector('.conn-scroll');
        if (connScroll) {
          connScroll.scrollTop = connScroll.scrollHeight;
          return 'scrolled conn-scroll to bottom: ' + connScroll.scrollHeight;
        }
        // Try any overflow container
        const scrollables = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = getComputedStyle(el);
          return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
        if (scrollables.length > 0) {
          scrollables[0].scrollTop = scrollables[0].scrollHeight;
          return 'scrolled first overflow to: ' + scrollables[0].className.substring(0, 50);
        }
        return 'no scrollable found. screens: ' + screens.length;
      }
      const scroller = activeScreen.querySelector('.conn-scroll') || activeScreen;
      scroller.scrollTop = scroller.scrollHeight;
      return 'scrolled active screen: ' + activeScreen.className.substring(0, 50);
    });
    console.log('Scroll:', scrollResult);

    // Also try scrolling window
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    // Check wave state
    const waveState = await page.evaluate(() => {
      const wave = document.querySelector('.wave-bottom');
      return wave ? 'wave class: ' + wave.className + ' opacity: ' + getComputedStyle(wave).opacity : 'no wave';
    });
    console.log('Wave:', waveState);

    await page.screenshot({ path: 'V:\\Muse\\_screenshots\\waves-bottom.png' });
    console.log('Saved waves-bottom.png');

    // Also scroll back up and take a clean discover screenshot
    await page.evaluate(() => {
      const connScroll = document.querySelector('.conn-scroll');
      if (connScroll) connScroll.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'V:\\Muse\\_screenshots\\discover-clean.png' });
    console.log('Saved discover-clean.png');

  } catch (e) {
    console.error('Error:', e.message);
  }
  await browser.close();
})();
