const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();

  // Navigate and wait for signup form
  await page.goto("https://muse.wyzdesign.com/muse", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('input[name="name"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Fill registration
  const nameField = await page.$('input[name="name"]');
  if (nameField) {
    await page.fill('input[name="name"]', "Screenshot Bot");
    await page.fill('input[name="email"]', "screenshots@test.com");
    await page.fill('input[name="password"]', "Test1234!");
  }

  // Click Get Started
  const createBtn = await page.$('button');
  if (createBtn) await createBtn.click();
  await page.waitForTimeout(3000);

  // Navigate discover onboarding
  for (let i = 0; i < 6; i++) {
    const btns = await page.$$('button');
    const nextBtn = btns.find(async (b) => {
      const text = await b.textContent();
      return text && (text.includes("Next") || text.includes("Continue") || text.includes("Skip") || text.includes("Get"));
    });
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  await page.waitForTimeout(3000);

  // Screenshot 1: Discover
  await page.screenshot({ path: "public/screenshots/discover.png", fullPage: false });
  console.log("✓ discover.png captured");

  // Navigate to Feed
  const navBtns = await page.$$('button, [role="tab"], .nav-item');
  for (const btn of navBtns) {
    const text = await btn.textContent().catch(() => "");
    if (text && text.includes("Feed")) {
      await btn.click();
      await page.waitForTimeout(2000);
      break;
    }
  }

  // Screenshot 2: Feed
  await page.screenshot({ path: "public/screenshots/feed.png", fullPage: false });
  console.log("✓ feed.png captured");

  await browser.close();
  console.log("Done — screenshots in public/screenshots/");
})();
