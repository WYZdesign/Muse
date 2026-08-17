import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  await page.goto('https://muse.wyzdesign.com/muse', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  const data = await page.evaluate(() => {
    const g = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
    };
    return {
      phone: g('.phone'),
      screenEl: g('.screen-el'),
      nav: g('.nav'),
      cardStack: g('.card-stack'),
      swipeCard: g('.swipe-card'),
      cardHero: g('.card-hero'),
      cardHeroInfo: g('.card-hero-info'),
      cardHeroName: g('.card-hero-name'),
      cardGradient: g('.card-gradient'),
      matchFab: g('.match-fab'),
      limitBar: g('.limit-bar'),
      innerHeight: window.innerHeight,
      visualViewport: window.visualViewport ? window.visualViewport.height : null,
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await page.screenshot({ path: 'temp_screens/measure_discover.png' });
  await browser.close();
})();
