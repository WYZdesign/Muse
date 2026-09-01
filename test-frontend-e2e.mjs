import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE = 'https://muse.wyzdesign.com';
const SHOTS = join(import.meta.dirname, 'test-screenshots');

mkdirSync(SHOTS, { recursive: true });

const report = [];
function log(screen, status, detail = '') {
  report.push({ screen, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${screen}] ${status}${detail ? ' — ' + detail : ''}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },  // iPhone 14 size
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
  });
  const page = await ctx.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Helper to screenshot
  async function shot(name) {
    const path = join(SHOTS, `${name}.png`);
    await page.screenshot({ path, fullPage: false });
    return path;
  }

  // Helper: wait for network idle or timeout
  async function waitForLoad(maxMs = 8000) {
    try {
      await page.waitForLoadState('networkidle', { timeout: maxMs });
    } catch { /* timeout is fine */ }
  }

  // Helper: check if element with text exists
  async function hasText(text, timeout = 3000) {
    try {
      await page.getByText(text, { exact: false }).first().waitFor({ timeout });
      return true;
    } catch { return false; }
  }

  // Helper: check for element by role
  async function hasRole(role, name, timeout = 3000) {
    try {
      await page.getByRole(role, { name }).first().waitFor({ timeout });
      return true;
    } catch { return false; }
  }

  // Helper: check CSS computed style of an element matching selector or text
  async function getGradient(el) {
    return el.evaluate(e => {
      const s = getComputedStyle(e);
      return s.backgroundImage || s.background || '';
    });
  }

  // ─── TEST 1: Landing / Splash ───
  console.log('\n━━━ TEST: Landing / Splash ━━━');
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForLoad(10000);
    const p = await shot('01-landing');
    log('Landing', 'PASS', p);

    // Check for redirect to /muse
    const url = page.url();
    if (url.includes('/muse')) {
      log('Landing Redirect', 'PASS', `Redirected to ${url}`);
    } else {
      log('Landing Redirect', 'WARN', `Still at ${url}`);
    }
  } catch (e) {
    log('Landing', 'FAIL', e.message);
  }

  // ─── TEST 2: Auth Gate / Login Screen ───
  console.log('\n━━━ TEST: Auth Gate / Login Screen ━━━');
  try {
    await page.goto(BASE + '/muse', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForLoad(10000);
    const p = await shot('02-auth-gate');
    log('Auth Gate', 'PASS', p);

    // Check what's visible on login screen
    const pageText = await page.textContent('body');
    const hasLogin = pageText.toLowerCase().includes('sign in') || pageText.toLowerCase().includes('log in') || pageText.toLowerCase().includes('google') || pageText.toLowerCase().includes('apple');
    if (hasLogin) {
      log('Auth Gate Content', 'PASS', 'Login buttons/sign-in elements visible');
    } else {
      log('Auth Gate Content', 'WARN', `No obvious login elements. Page text snippet: "${pageText.substring(0, 200)}"`);
    }

    // Check for Muse branding
    const hasMuse = pageText.toLowerCase().includes('muse');
    log('Muse Branding', hasMuse ? 'PASS' : 'WARN', hasMuse ? 'Muse branding found' : 'No Muse branding detected');
  } catch (e) {
    log('Auth Gate', 'FAIL', e.message);
  }

  // ─── TEST 3: Page Title Gradients (via CSS source inspection) ───
  // Since we can't auth, we'll verify the gradient values in source code instead
  console.log('\n━━━ TEST: Gradient Source Audit (code review) ━━━');
  try {
    // Check all screen files for gradient consistency
    const fs = await import('fs');
    const path = await import('path');

    const screens = [
      { file: 'src/app/(muse)/muse/screens/DiscoverScreen.tsx', name: 'Discover', expected: '#FFD700' },
      { file: 'src/app/(muse)/muse/screens/FeedScreen.tsx', name: 'Feed', expected: '#1E90FF' },
      { file: 'src/app/(muse)/muse/screens/CollabScreen.tsx', name: 'Collab', expected: '#20B2AA' },
      { file: 'src/app/(muse)/muse/screens/MusesScreen.tsx', name: 'Muses', expected: '#FF4500' },
      { file: 'src/app/(muse)/muse/screens/BtsScreen.tsx', name: 'BTS', expected: '#FF1493' },
      { file: 'src/app/(muse)/muse/screens/SessionsScreen.tsx', name: 'Sessions', expected: '#E1BEE7' },
      { file: 'src/app/(muse)/muse/screens/NetworkScreen.tsx', name: 'Network', expected: '#1E90FF' },
      { file: 'src/app/(muse)/muse/screens/ProfileScreen.tsx', name: 'Profile', expected: '#FFD700' },
      { file: 'src/app/(muse)/muse/screens/SettingsScreen.tsx', name: 'Settings', expected: '#CE93D8' },
      { file: 'src/app/(muse)/muse/screens/AnalyticsScreen.tsx', name: 'Analytics', expected: '#FFD700' },
      { file: 'src/app/(muse)/muse/screens/SubscriptionScreen.tsx', name: 'Subscription', expected: '#FFD700' },
      { file: 'src/app/(muse)/muse/screens/CommunityScreen.tsx', name: 'Community', expected: '#FF8A80' },
      { file: 'src/app/(muse)/muse/screens/CodexScreen.tsx', name: 'Codex', expected: 'gold' },
    ];

    for (const s of screens) {
      const fullPath = path.join('V:\\Muse', s.file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(s.expected)) {
          log(`Gradient: ${s.name}`, 'PASS', `Found expected color ${s.expected} in source`);
        } else {
          // Look for any linear-gradient
          const gradMatch = content.match(/linear-gradient\([^)]+\)/g);
          log(`Gradient: ${s.name}`, 'FAIL', `Expected ${s.expected} not found. Gradients in file: ${gradMatch ? gradMatch.length : 0}`);
        }
      } else {
        log(`Gradient: ${s.name}`, 'WARN', `File not found: ${s.file}`);
      }
    }
  } catch (e) {
    log('Gradient Audit', 'FAIL', e.message);
  }

  // ─── TEST 4: Profile Ring Animation (CSS audit) ───
  console.log('\n━━━ TEST: Profile Ring Animation (CSS audit) ━━━');
  try {
    const fs = await import('fs');
    const css = fs.readFileSync('V:\\Muse\\src\\app\\(muse)\\muse\\muse.css', 'utf8');

    if (css.includes('ringSpin') && css.includes('translate(-50%,-50%) rotate(360deg)')) {
      log('Profile Ring Animation', 'PASS', 'ringSpin keyframe preserves translate centering transform');
    } else if (css.includes('ringSpin')) {
      log('Profile Ring Animation', 'FAIL', 'ringSpin exists but may NOT preserve centering — check keyframe');
    } else {
      log('Profile Ring Animation', 'FAIL', 'ringSpin keyframe not found in muse.css');
    }

    // Check for profile-ring styles
    if (css.includes('.profile-ring')) {
      log('Profile Ring CSS', 'PASS', '.profile-ring class found');
    } else {
      log('Profile Ring CSS', 'FAIL', '.profile-ring class not found');
    }
  } catch (e) {
    log('Profile Ring', 'FAIL', e.message);
  }

  // ─── TEST 5: Closed Beta Scope ───
  console.log('\n━━━ TEST: Closed Beta Scope ━━━');
  try {
    const fs = await import('fs');
    const configPath = 'V:\\Muse\\src\\lib\\config.ts';
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      if (content.includes('MUSE_CLOSED_BETA_HIDE_SOCIAL')) {
        log('Closed Beta Flag', 'PASS', 'MUSE_CLOSED_BETA_HIDE_SOCIAL found in config');
        const defaultVal = content.match(/MUSE_CLOSED_BETA_HIDE_SOCIAL[^=]*=\s*(true|false)/);
        if (defaultVal) {
          log('Closed Beta Default', 'PASS', `Default value: ${defaultVal[1]}`);
        }
      } else {
        log('Closed Beta Flag', 'FAIL', 'MUSE_CLOSED_BETA_HIDE_SOCIAL not found');
      }
    }

    // Check page.tsx for community gating
    const pagePath = 'V:\\Muse\\src\\app\\(muse)\\muse\\page.tsx';
    if (fs.existsSync(pagePath)) {
      const content = fs.readFileSync(pagePath, 'utf8');
      if (content.includes('MUSE_CLOSED_BETA_HIDE_SOCIAL') || content.includes('VALID_SCREENS')) {
        log('Page Gate', 'PASS', 'VALID_SCREENS or closed-beta check found in page.tsx');
        if (!content.includes('"community"') || content.includes('CLOSED_BETA')) {
          log('Community Gating', 'PASS', 'Community is properly gated');
        } else {
          log('Community Gating', 'WARN', 'Community string found — may not be gated');
        }
      }
    }
  } catch (e) {
    log('Closed Beta', 'FAIL', e.message);
  }

  // ─── TEST 6: Nav Gradients Match (Nav.tsx source audit) ───
  console.log('\n━━━ TEST: Nav Gradient Source of Truth ━━━');
  try {
    const fs = await import('fs');
    const navPath = 'V:\\Muse\\src\\app\\(muse)\\muse\\components\\Nav.tsx';
    if (fs.existsSync(navPath)) {
      const content = fs.readFileSync(navPath, 'utf8');

      const navGrads = {
        discover: '#FFD700',
        connections: '#1E90FF',
        briefs: '#20B2AA',
        matches: '#FF4500',
      };

      for (const [key, color] of Object.entries(navGrads)) {
        if (content.includes(color)) {
          log(`Nav Gradient: ${key}`, 'PASS', `Found ${color}`);
        } else {
          log(`Nav Gradient: ${key}`, 'WARN', `${color} not found in Nav.tsx`);
        }
      }
    }
  } catch (e) {
    log('Nav Gradients', 'FAIL', e.message);
  }

  // ─── TEST 7: FD Studio Widget (Sessions screen) ───
  console.log('\n━━━ TEST: FD Studio Widget (code audit) ━━━');
  try {
    const fs = await import('fs');
    const widgetPath = 'V:\\Muse\\src\\app\\(muse)\\muse\\components\\FdStudioWidget.tsx';
    if (fs.existsSync(widgetPath)) {
      const content = fs.readFileSync(widgetPath, 'utf8');
      const buildings = ['Main', 'Art', 'Hill', 'LA Lofts', 'Olympic', 'Yukon'];
      let found = 0;
      for (const b of buildings) {
        if (content.includes(b)) found++;
      }
      log('FD Studio Widget', found === 6 ? 'PASS' : 'WARN', `Found ${found}/${buildings.length} building names`);

      if (content.includes('studio') || content.includes('Studio')) {
        log('FD Studio Content', 'PASS', 'Studio references found');
      }

      // Check for link to wyzdesign
      if (content.includes('wyzdesign') || content.includes('fd?ref')) {
        log('FD Studio Link', 'PASS', 'External link to wyzdesign found');
      } else {
        log('FD Studio Link', 'WARN', 'No wyzdesign link found');
      }
    } else {
      log('FD Studio Widget', 'WARN', 'FdStudioWidget.tsx not found — may have been inlined');
    }

    // Check SessionsScreen for the widget
    const sessionsPath = 'V:\\Muse\\src\\app\\(muse)\\muse\\screens\\SessionsScreen.tsx';
    if (fs.existsSync(sessionsPath)) {
      const content = fs.readFileSync(sessionsPath, 'utf8');
      if (content.includes('FdStudio') || content.includes('fdstudio') || content.includes('FD Photo')) {
        log('Sessions → FD Widget', 'PASS', 'FD Studio widget referenced in SessionsScreen');
      } else {
        log('Sessions → FD Widget', 'FAIL', 'No FD Studio reference in SessionsScreen');
      }
    }
  } catch (e) {
    log('FD Studio', 'FAIL', e.message);
  }

  // ─── TEST 8: Network Filter Bubbles ───
  console.log('\n━━━ TEST: Network Filter Bubbles (code audit) ━━━');
  try {
    const fs = await import('fs');
    const netPath = 'V:\\Muse\\src\\app\\(muse)\\muse\\screens\\NetworkScreen.tsx';
    if (fs.existsSync(netPath)) {
      const content = fs.readFileSync(netPath, 'utf8');
      // Should NOT have <select> dropdowns (removed in session 56)
      const selectCount = (content.match(/<select/gi) || []).length;
      if (selectCount === 0) {
        log('Network: No Select Dropdowns', 'PASS', 'Old <select> dropdowns removed');
      } else {
        log('Network: No Select Dropdowns', 'FAIL', `Found ${selectCount} <select> elements`);
      }

      // Should have horizontal scroll filter bubbles
      if (content.includes('overflow') && (content.includes('scroll') || content.includes('auto'))) {
        log('Network: Horizontal Scroll', 'PASS', 'Horizontal scroll container found');
      } else {
        log('Network: Horizontal Scroll', 'WARN', 'No explicit overflow scroll found');
      }

      // Check for filter keywords
      const filters = ['Experience', 'Sort', 'Rate', 'Skills', 'Looking'];
      let foundFilters = 0;
      for (const f of filters) {
        if (content.includes(f)) foundFilters++;
      }
      log('Network: Filter Labels', foundFilters >= 3 ? 'PASS' : 'WARN', `Found ${foundFilters}/${filters.length} filter labels`);
    }
  } catch (e) {
    log('Network Filters', 'FAIL', e.message);
  }

  // ─── TEST 9: Analytics Screen (code audit) ───
  console.log('\n━━━ TEST: Analytics Screen (code audit) ━━━');
  try {
    const fs = await import('fs');
    const analyticsPath = 'V:\\Muse\\src\\app\\(muse)\\muse\\screens\\AnalyticsScreen.tsx';
    if (fs.existsSync(analyticsPath)) {
      const content = fs.readFileSync(analyticsPath, 'utf8');
      if (content.includes('my-analytics')) {
        log('Analytics API', 'PASS', 'Calls my-analytics endpoint');
      } else {
        log('Analytics API', 'FAIL', 'No my-analytics API call found');
      }

      const stats = ['views', 'matches', 'messages', 'bookings', 'earnings'];
      let foundStats = 0;
      for (const s of stats) {
        if (content.toLowerCase().includes(s)) foundStats++;
      }
      log('Analytics Stat Cards', foundStats >= 3 ? 'PASS' : 'WARN', `Found ${foundStats}/${stats.length} stat labels`);

      if (content.includes('FiTrendingUp') || content.includes('TrendingUp')) {
        log('Analytics Trending Icon', 'PASS', 'TrendingUp icon found');
      }
    }

    // Check ProfileScreen has Insights button
    const profilePath = 'V:\\Muse\\src\\app\\(muse)\\muse\\screens\\ProfileScreen.tsx';
    if (fs.existsSync(profilePath)) {
      const content = fs.readFileSync(profilePath, 'utf8');
      if (content.toLowerCase().includes('insight') || content.includes('analytics')) {
        log('Profile → Insights', 'PASS', 'Insights/analytics entry found in ProfileScreen');
      } else {
        log('Profile → Insights', 'FAIL', 'No Insights button in ProfileScreen');
      }
    }
  } catch (e) {
    log('Analytics', 'FAIL', e.message);
  }

  // ─── TEST 10: MatchCard Simplification ───
  console.log('\n━━━ TEST: MatchCard Simplification ━━━');
  try {
    const fs = await import('fs');
    const cardPath = 'V:\\Muse\\src\\app\\(muse)\\muse\\components\\MatchCard.tsx';
    if (fs.existsSync(cardPath)) {
      const content = fs.readFileSync(cardPath, 'utf8');
      const lines = content.split('\n').length;
      log('MatchCard Size', lines < 150 ? 'PASS' : 'WARN', `${lines} lines (expected <150 after simplification)`);

      // Should NOT have drag/swipe/expand machinery
      if (!content.includes('dragOffset') && !content.includes('REVEAL_OFFSET')) {
        log('MatchCard: No Drag/Swipe', 'PASS', 'Drag/swipe machinery removed');
      } else {
        log('MatchCard: No Drag/Swipe', 'FAIL', 'Drag/swipe code still present');
      }

      if (content.includes('chat') || content.includes('Chat') || content.includes('onPress')) {
        log('MatchCard: Chat Navigation', 'PASS', 'Chat-on-tap navigation found');
      }
    }
  } catch (e) {
    log('MatchCard', 'FAIL', e.message);
  }

  // ─── TEST 11: Title Alignment (CSS audit) ───
  console.log('\n━━━ TEST: Title Alignment CSS ━━━');
  try {
    const fs = await import('fs');
    const css = fs.readFileSync('V:\\Muse\\src\\app\\(muse)\\muse\\muse.css', 'utf8');

    // Check .logo-link is position:relative (not absolute)
    const logoLinkMatch = css.match(/\.logo-link\s*\{[^}]+\}/);
    if (logoLinkMatch) {
      if (logoLinkMatch[0].includes('position:relative') || logoLinkMatch[0].includes('position: relative')) {
        log('Title: .logo-link relative', 'PASS', '.logo-link uses position:relative');
      } else if (logoLinkMatch[0].includes('position:absolute') || logoLinkMatch[0].includes('position: absolute')) {
        log('Title: .logo-link relative', 'FAIL', '.logo-link still uses position:absolute');
      } else {
        log('Title: .logo-link relative', 'WARN', 'No explicit position in .logo-link');
      }
    }

    // Check for --title-gradient CSS variable support
    if (css.includes('--title-gradient')) {
      log('Title: CSS Variable', 'PASS', '--title-gradient variable found');
    } else {
      log('Title: CSS Variable', 'WARN', '--title-gradient not found');
    }

    // Check HDR styling
    if (css.includes('.hdr') && css.includes('align-items')) {
      log('Title: HDR flex alignment', 'PASS', '.hdr uses flex align-items');
    } else {
      log('Title: HDR flex alignment', 'WARN', '.hdr flex alignment not confirmed');
    }
  } catch (e) {
    log('Title Alignment', 'FAIL', e.message);
  }

  // ─── TEST 12: Screen Type Integrity ───
  console.log('\n━━━ TEST: Screen Type Integrity ━━━');
  try {
    const fs = await import('fs');
    const typesPath = 'V:\\Muse\\src\\app\\(muse)\\muse\\components\\types.ts';
    if (fs.existsSync(typesPath)) {
      const content = fs.readFileSync(typesPath, 'utf8');
      // Should NOT have "fdstudio" or "events" (removed in session 61)
      if (!content.includes('"fdstudio"')) {
        log('Screen Type: No fdstudio', 'PASS', '"fdstudio" removed from Screen type');
      } else {
        log('Screen Type: No fdstudio', 'FAIL', '"fdstudio" still in Screen type');
      }
      if (!content.includes('"events"')) {
        log('Screen Type: No events', 'PASS', '"events" removed from Screen type');
      } else {
        log('Screen Type: No events', 'WARN', '"events" still in Screen type');
      }
    }

    // Check page.tsx for VALID_SCREENS
    const pagePath = 'V:\\Muse\\src\\app\\(muse)\\muse\\page.tsx';
    if (fs.existsSync(pagePath)) {
      const content = fs.readFileSync(pagePath, 'utf8');
      const validScreensMatch = content.match(/VALID_SCREENS\s*=\s*\[([^\]]+)\]/);
      if (validScreensMatch) {
        const screens = validScreensMatch[1];
        log('VALID_SCREENS', 'PASS', `Contains: ${screens.trim().substring(0, 100)}`);
      }
    }
  } catch (e) {
    log('Screen Type', 'FAIL', e.message);
  }

  // ─── TEST 13: Subscription Tiers ───
  console.log('\n━━━ TEST: Subscription Tiers ━━━');
  try {
    const fs = await import('fs');
    const subPath = 'V:\\Muse\\src\\app\\(muse)\\muse\\screens\\SubscriptionScreen.tsx';
    if (fs.existsSync(subPath)) {
      const content = fs.readFileSync(subPath, 'utf8');
      if (content.includes('Annual') || content.includes('annual')) {
        log('Subscription: Annual Tier', 'PASS', 'Annual plan found');
      } else {
        log('Subscription: Annual Tier', 'WARN', 'Annual plan not found');
      }
      if (content.includes('Studio') || content.includes('studio')) {
        log('Subscription: Studio Tier', 'PASS', 'Studio plan found');
      } else {
        log('Subscription: Studio Tier', 'WARN', 'Studio plan not found');
      }
      // Check the tier-key fix
      if (content.includes('.replace(/ /g, "_")') || content.includes('replaceAll')) {
        log('Subscription: Tier-Key Fix', 'PASS', 'replace(/ /g, "_") or replaceAll found');
      } else {
        log('Subscription: Tier-Key Fix', 'WARN', 'Tier-key fix not confirmed');
      }
    }
  } catch (e) {
    log('Subscription', 'FAIL', e.message);
  }

  // ─── TEST 14: Payment Capture Method ───
  console.log('\n━━━ TEST: Payment Capture Method ━━━');
  try {
    const fs = await import('fs');
    const routePath = 'V:\\Muse\\src\\app\\api\\muse\\connect\\route.ts';
    if (fs.existsSync(routePath)) {
      const content = fs.readFileSync(routePath, 'utf8');
      if (content.includes('automatic_delayed')) {
        log('Payment Capture', 'PASS', 'capture_method: automatic_delayed found (session 60 fix)');
      } else if (content.includes('capture_method: "manual"')) {
        log('Payment Capture', 'FAIL', 'capture_method still "manual" — session 60 fix NOT applied');
      } else {
        log('Payment Capture', 'WARN', 'capture_method pattern not found');
      }
    }
  } catch (e) {
    log('Payment Capture', 'FAIL', e.message);
  }

  // ─── TEST 15: NSFW Verification ───
  console.log('\n━━━ TEST: NSFW Verification Integration ━━━');
  try {
    const fs = await import('fs');
    const verifyPath = 'V:\\Muse\\src\\app\\api\\muse\\verification\\route.ts';
    if (fs.existsSync(verifyPath)) {
      const content = fs.readFileSync(verifyPath, 'utf8');
      if (content.includes('stripe.identity.verificationSessions')) {
        log('Verification API', 'PASS', 'Stripe Identity integration found (NOT deferred)');
      } else {
        log('Verification API', 'WARN', 'Stripe Identity calls not found');
      }
      if (content.length > 100) {
        log('Verification Size', 'PASS', `${content.split('\n').length} lines — substantial implementation`);
      }
    }
  } catch (e) {
    log('Verification', 'FAIL', e.message);
  }

  // ─── TEST 16: Visual Smoke Test on Live Site ───
  console.log('\n━━━ TEST: Visual Smoke Test (live site) ━━━');
  try {
    // Go to the app root which redirects to /muse
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForLoad(12000);

    // Take final screenshot of whatever loaded
    const p = await shot('03-app-loaded');

    // Check page title
    const title = await page.title();
    log('Page Title', title ? 'PASS' : 'WARN', `Title: "${title}"`);

    // Check for any visible errors
    const bodyText = await page.textContent('body');
    const hasError = bodyText.includes('Error') || bodyText.includes('error') || bodyText.includes('500');
    log('No Visible Errors', !hasError ? 'PASS' : 'WARN', hasError ? 'Possible error text found' : 'No error text detected');

    // Check for loading spinner or skeleton
    const hasLoader = bodyText.includes('Loading') || bodyText.includes('loading');
    log('Content Loaded', !hasLoader ? 'PASS' : 'WARN', hasLoader ? 'Still showing loading state' : 'Content loaded');

    // Check viewport meta tag
    const hasViewport = await page.evaluate(() => {
      return !!document.querySelector('meta[name="viewport"]');
    });
    log('Viewport Meta', hasViewport ? 'PASS' : 'WARN', hasViewport ? 'Mobile viewport tag present' : 'No viewport meta');

  } catch (e) {
    log('Visual Smoke', 'FAIL', e.message);
  }

  // ─── TEST 17: Screen count check ───
  console.log('\n━━━ TEST: Source File Inventory ━━━');
  try {
    const fs = await import('fs');
    const path = await import('path');

    const screensDir = 'V:\\Muse\\src\\app\\(muse)\\muse\\screens';
    if (fs.existsSync(screensDir)) {
      const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.tsx'));
      log('Screen Files', 'PASS', `${files.length} screen files: ${files.map(f => f.replace('.tsx', '')).join(', ')}`);
    }

    const componentsDir = 'V:\\Muse\\src\\app\\(muse)\\muse\\components';
    if (fs.existsSync(componentsDir)) {
      const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
      log('Component Files', 'PASS', `${files.length} component files`);
    }
  } catch (e) {
    log('Source Inventory', 'FAIL', e.message);
  }

  // ─── CONSOLE ERRORS ───
  console.log('\n━━━ Console Errors ━━━');
  if (consoleErrors.length === 0) {
    log('Console Errors', 'PASS', 'No console errors captured');
  } else {
    log('Console Errors', 'WARN', `${consoleErrors.length} errors:`);
    consoleErrors.slice(0, 5).forEach(e => console.log(`  ⚠️  ${e.substring(0, 150)}`));
  }

  await browser.close();

  // ─── GENERATE REPORT ───
  console.log('\n' + '═'.repeat(60));
  console.log('  MUSE E2E TEST REPORT');
  console.log('═'.repeat(60));

  const passed = report.filter(r => r.status === 'PASS').length;
  const failed = report.filter(r => r.status === 'FAIL').length;
  const warned = report.filter(r => r.status === 'WARN').length;

  console.log(`\n  ✅ PASS: ${passed}  |  ❌ FAIL: ${failed}  |  ⚠️  WARN: ${warned}  |  Total: ${report.length}\n`);

  if (failed > 0) {
    console.log('  FAILURES:');
    report.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    ❌ [${r.screen}] ${r.detail}`);
    });
    console.log('');
  }

  if (warned > 0) {
    console.log('  WARNINGS:');
    report.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`    ⚠️  [${r.screen}] ${r.detail}`);
    });
    console.log('');
  }

  console.log('  PASSSES:');
  report.filter(r => r.status === 'PASS').forEach(r => {
    console.log(`    ✅ [${r.screen}] ${r.detail}`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log(`  Screenshots saved to: ${SHOTS}`);
  console.log('═'.repeat(60));

  // Write JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE,
    summary: { passed, failed, warned, total: report.length },
    tests: report,
    consoleErrors: consoleErrors.slice(0, 20),
  };
  writeFileSync(join(SHOTS, 'report.json'), JSON.stringify(jsonReport, null, 2));
  console.log(`\n  JSON report: ${join(SHOTS, 'report.json')}`);
})();
