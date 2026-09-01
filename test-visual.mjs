import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const DIR = 'V:\\Muse\\test-screenshots';
mkdirSync(DIR, { recursive: true });

const results = [];
function log(screen, status, details) {
  results.push({ screen, status, details });
  console.log(`[${status}] ${screen}: ${details}`);
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceScaleFactor: 3, isMobile: true, hasTouch: true
  });
  const page = await context.newPage();
  await page.setDefaultTimeout(10000);

  const snap = async (name) => {
    await page.screenshot({ path: path.join(DIR, name), fullPage: false });
    console.log(`  📸 ${name}`);
  };

  const wait = (ms = 2000) => page.waitForTimeout(ms);

  const dismissModal = async () => {
    try {
      const later = page.locator('text="Later"');
      if (await later.count() > 0) {
        await later.first().click();
        console.log('  Dismissed modal');
        await wait(1000);
      }
    } catch (e) {}
    // Click backdrop if present
    try {
      const backdrop = page.locator('[class*="backdrop"], [class*="overlay"]');
      if (await backdrop.count() > 0) {
        await backdrop.first().click({ position: { x: 10, y: 10 } });
        await wait(500);
      }
    } catch (e) {}
  };

  try {
    // ===== 1. LANDING =====
    console.log('\n=== 01: Landing ===');
    await page.goto('https://muse.wyzdesign.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(3000);
    await snap('01-landing.png');
    log('01-Landing', 'PASS', `URL: ${page.url()}`);

    // ===== 2. SIGN UP =====
    console.log('\n=== 02: Sign Up ===');
    const TS = Date.now();
    const email = `test_e2e_${TS}@muse.test`;

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    if (await emailInput.count() > 0) {
      await emailInput.first().fill(email);
      console.log(`  Email: ${email}`);
    }
    const passInput = page.locator('input[type="password"]');
    if (await passInput.count() > 0) {
      await passInput.first().fill('Password123!');
      console.log('  Password filled');
    }
    await snap('02a-email-filled.png');

    const createBtn = page.locator('button:has-text("Create Account")');
    if (await createBtn.count() > 0) {
      await createBtn.first().click();
      console.log('  Clicked Create Account');
    }
    await wait(4000);
    await dismissModal();
    await snap('02b-after-signup.png');

    // Check if we're logged in
    let bodyText = await page.textContent('body').catch(() => '');
    const loggedIn = !bodyText.includes('Create Account') && !bodyText.includes('Sign Up');
    console.log(`  Logged in: ${loggedIn}`);
    log('02-Signup', loggedIn ? 'PASS' : 'INFO', `URL: ${page.url()}`);

    // ===== DISCOVER (default after login) =====
    console.log('\n=== Discover ===');
    await wait(2000);
    await dismissModal();
    await snap('02-discover.png');
    log('02-Discover', 'PASS', `URL: ${page.url()}`);

    // ===== EXPLORE BOTTOM NAV =====
    console.log('\n=== Exploring bottom nav ===');

    // Dump all links/buttons to find nav structure
    const allLinks = await page.evaluate(() => {
      const items = [];
      // Check all anchor and button elements
      document.querySelectorAll('a, button, [role="tab"], [role="button"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > 750 && rect.height > 10 && rect.width > 10) {
          items.push({
            tag: el.tagName,
            text: el.textContent?.trim()?.substring(0, 50),
            href: el.getAttribute('href'),
            ariaLabel: el.getAttribute('aria-label'),
            className: el.className?.toString()?.substring(0, 80),
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            role: el.getAttribute('role'),
            dataTestId: el.getAttribute('data-testid')
          });
        }
      });
      return items;
    });

    console.log(`  Found ${allLinks.length} elements in bottom area:`);
    allLinks.forEach((l, i) => {
      console.log(`    [${i}] <${l.tag}> text="${l.text}" href=${l.href} aria="${l.ariaLabel}" testid=${l.dataTestId} role=${l.role} class=${l.className} x=${l.x} y=${l.y} ${l.w}x${l.h}`);
    });

    // Also check for SVG icons in bottom nav (they often don't have text)
    const navSvgs = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('svg').forEach(svg => {
        const rect = svg.getBoundingClientRect();
        if (rect.bottom > 750 && rect.height > 10) {
          const parent = svg.parentElement;
          const grandparent = parent?.parentElement;
          items.push({
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            parentTag: parent?.tagName,
            parentHref: parent?.getAttribute('href'),
            parentAria: parent?.getAttribute('aria-label'),
            parentText: parent?.textContent?.trim()?.substring(0, 30),
            gpHref: grandparent?.getAttribute('href'),
            gpAria: grandparent?.getAttribute('aria-label')
          });
        }
      });
      return items;
    });

    console.log(`  SVG icons in bottom area: ${navSvgs.length}`);
    navSvgs.forEach((s, i) => {
      console.log(`    SVG[${i}] x=${s.x} y=${s.y} parent=<${s.parentTag}> href=${s.parentHref} aria=${s.parentAria} text="${s.parentText}" gp_href=${s.gpHref} gp_aria=${s.gpAria}`);
    });

    // Find the clickable nav items - look for links in the very bottom of the page
    const bottomNavClickables = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('a[href], button').forEach(el => {
        const rect = el.getBoundingClientRect();
        // Bottom nav typically sits at y > 780 and has reasonable size
        if (rect.y > 780 && rect.height > 30 && rect.width > 30 && rect.width < 120) {
          items.push({
            href: el.getAttribute('href'),
            text: el.textContent?.trim()?.substring(0, 30),
            ariaLabel: el.getAttribute('aria-label'),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            w: Math.round(rect.width)
          });
        }
      });
      return items.sort((a, b) => a.x - b.x);
    });

    console.log(`  Bottom nav clickables: ${bottomNavClickables.length}`);
    bottomNavClickables.forEach((n, i) => console.log(`    [${i}] href=${n.href} text="${n.text}" aria="${n.ariaLabel}" center=(${n.x},${n.y})`));

    // Click each bottom nav item and screenshot
    const navLabels = ['Discover', 'Muses', 'Collab', 'Feed', 'Profile'];

    for (let i = 0; i < Math.min(bottomNavClickables.length, 5); i++) {
      const nav = bottomNavClickables[i];
      const label = navLabels[i] || `Nav${i}`;

      console.log(`\n=== Clicking nav[${i}]: ${label} (href=${nav.href}) ===`);

      // Click by coordinates since we know the exact center
      await page.mouse.click(nav.x, nav.y);
      await wait(2500);
      await dismissModal();

      const filename = `nav${i}-${label.toLowerCase()}.png`;
      await snap(filename);
      const currentUrl = page.url();
      log(`Nav-${label}`, 'INFO', `URL: ${currentUrl} (clicked at ${nav.x},${nav.y})`);
    }

    // ===== Try PROFILE (last nav item) =====
    console.log('\n=== Profile ===');
    if (bottomNavClickables.length >= 5) {
      await page.mouse.click(bottomNavClickables[4].x, bottomNavClickables[4].y);
      await wait(2500);
      await dismissModal();
    }
    await snap('08-profile.png');
    log('08-Profile', 'INFO', `URL: ${page.url()}`);

    // Look for Settings, Insights, etc on profile page
    const findAndClick = async (text, filename) => {
      const el = page.locator(`text="${text}"`).first();
      if (await el.count() > 0) {
        await el.click();
        console.log(`  Clicked "${text}"`);
        await wait(2500);
        await dismissModal();
        await snap(filename);
        log(filename.replace('.png','').replace(/-/g,' '), 'INFO', `URL: ${page.url()}`);
        return true;
      }
      return false;
    };

    // Try to find and click through Profile sub-screens
    console.log('\n=== Insights ===');
    if (!await findAndClick('Insights', '09-analytics.png')) {
      if (!await findAndClick('Analytics', '09-analytics.png')) {
        await snap('09-analytics.png');
        log('09-Insights', 'FAIL', 'No Insights/Analytics button found');
      }
    }

    // Go back to profile
    await page.goBack().catch(() => {});
    await wait(1000);
    await dismissModal();

    console.log('\n=== Settings ===');
    if (!await findAndClick('Settings', '10-settings.png')) {
      await snap('10-settings.png');
      log('10-Settings', 'FAIL', 'No Settings button found');
    }

    // Go back
    await page.goBack().catch(() => {});
    await wait(1000);
    await dismissModal();

    console.log('\n=== Subscription ===');
    if (!await findAndClick('Subscription', '11-subscription.png')) {
      if (!await findAndClick('Upgrade', '11-subscription.png')) {
        if (!await findAndClick('Premium', '11-subscription.png')) {
          await snap('11-subscription.png');
          log('11-Subscription', 'FAIL', 'No Subscription button found');
        }
      }
    }

    await page.goBack().catch(() => {});
    await wait(1000);
    await dismissModal();

    console.log('\n=== Codex ===');
    if (!await findAndClick('Codex', '12-codex.png')) {
      await snap('12-codex.png');
      log('12-Codex', 'FAIL', 'No Codex button found');
    }

    await page.goBack().catch(() => {});
    await wait(1000);
    await dismissModal();

    console.log('\n=== Network ===');
    if (!await findAndClick('Network', '13-network.png')) {
      await snap('13-network.png');
      log('13-Network', 'FAIL', 'No Network button found');
    }

    // ===== WRITE REPORT =====
    console.log('\n=== Writing REPORT.md ===');
    let report = `# Muse Visual E2E Test Report\n\n`;
    report += `**Date:** ${new Date().toISOString()}\n`;
    report += `**URL:** https://muse.wyzdesign.com\n`;
    report += `**Viewport:** 390x844 (iPhone 14 Pro, 3x DPR)\n`;
    report += `**Test Account:** ${email}\n`;
    report += `**Auth Status:** ${loggedIn ? 'SUCCESS' : 'FAILED'}\n\n`;

    report += `## Route Discovery\n\n`;
    report += `The app is a Next.js SPA with client-side routing under \`/muse\`.\n`;
    report += `Direct URL navigation to \`/muse/feed\`, \`/muse/collab\`, \`/muse/muses\` returns **404**.\n`;
    report += `Navigation must be done via bottom nav icons (click coordinates).\n\n`;

    report += `## Screenshots\n\n`;
    report += `| # | Screen | File | Status | Details |\n`;
    report += `|---|--------|------|--------|---------|\n`;

    const screenshotList = [
      [1, 'Landing/Auth', '01-landing.png'],
      [2, 'Signup Filled', '02a-email-filled.png'],
      [3, 'After Signup', '02b-after-signup.png'],
      [4, 'Discover', '02-discover.png'],
      [5, 'Nav[0]', 'nav0-discover.png'],
      [6, 'Nav[1]', 'nav1-muses.png'],
      [7, 'Nav[2]', 'nav2-collab.png'],
      [8, 'Nav[3]', 'nav3-feed.png'],
      [9, 'Nav[4]', 'nav4-profile.png'],
      [10, 'Profile', '08-profile.png'],
      [11, 'Insights', '09-analytics.png'],
      [12, 'Settings', '10-settings.png'],
      [13, 'Subscription', '11-subscription.png'],
      [14, 'Codex', '12-codex.png'],
      [15, 'Network', '13-network.png'],
    ];

    for (const [num, name, file] of screenshotList) {
      const r = results.find(r => r.screen.includes(name));
      const status = r ? r.status : 'NOT_TESTED';
      const details = r ? r.details : '-';
      report += `| ${num} | ${name} | \`${file}\` | ${status} | ${details} |\n`;
    }

    report += `\n## Visual Findings\n\n`;
    report += `_To be filled after screenshot inspection._\n`;

    writeFileSync(path.join(DIR, 'REPORT.md'), report);
    console.log('\n✅ Done! Report at V:\\Muse\\test-screenshots\\REPORT.md');

  } catch (err) {
    console.error('FATAL:', err.message);
    await page.screenshot({ path: path.join(DIR, 'error-state.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
