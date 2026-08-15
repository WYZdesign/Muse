import { chromium } from "playwright";
import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}/muse`;
const SCREEN_DIR = path.resolve("temp_screens");

if (!fs.existsSync(SCREEN_DIR)) {
  fs.mkdirSync(SCREEN_DIR, { recursive: true });
}

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/muse`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startServerIfNeeded() {
  const running = await checkServer();
  if (running) {
    console.log("Server already running on port", PORT);
    return null;
  }
  console.log("Starting Next.js production server on port", PORT);
  const child = spawn("npx.cmd", ["next", "start", "-p", String(PORT)], {
    stdio: "pipe",
    shell: true,
    cwd: process.cwd(),
  });

  child.stdout.on("data", (d) => {
    const s = d.toString();
    if (s.includes("Ready") || s.includes("compiled")) console.log("[Next]", s.trim());
  });
  child.stderr.on("data", (d) => {
    console.error("[Next err]", d.toString().trim());
  });

  // Wait up to 45 seconds for server to be ready
  const start = Date.now();
  while (Date.now() - start < 45000) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await checkServer()) {
      console.log("Next server is ready!");
      return child;
    }
  }
  throw new Error("Next server failed to start in time");
}

async function capture() {
  const child = await startServerIfNeeded();
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`Capturing for viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Mock auth API call to succeed with profile
    await page.route("**/api/muse/auth", async (route) => {
      const json = {
        success: true,
        user: { id: "usr_mock_123", email: "torree@wyzdesign.com" },
        profile: {
          id: "usr_mock_123",
          name: "Torreé",
          type: "Creative Director",
          bio: "Building the future of creative collaboration.",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
          tier: "muse_pro",
          age_verified: true,
        },
      };
      await route.fulfill({ json, status: 200, contentType: "application/json" });
    });

    // Also mock other /api/muse calls to prevent 500 errors
    await page.route("**/api/muse*", async (route) => {
      if (route.request().url().includes("/api/muse/auth")) {
        return route.fallback();
      }
      await route.fulfill({ json: { success: true, data: [] }, status: 200, contentType: "application/json" });
    });

    // Set localStorage state to bypass auth gate and load full app
    await page.addInitScript(() => {
      const mockUser = {
        id: "usr_mock_123",
        email: "torree@wyzdesign.com",
        profile: {
          id: "usr_mock_123",
          name: "Torreé",
          type: "Creative Director",
          bio: "Building the future of creative collaboration.",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
          tier: "muse_pro",
          age_verified: true,
        },
      };

      const mockMatches = [
        {
          id: "m_1",
          name: "Maya Chen",
          type: "Fashion Photographer",
          img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
          online: true,
          bio: "Editorial & visual storytelling in NYC & Paris.",
          location: "New York, NY",
          distanceMi: 4,
          zodiac: "Leo",
          messages: [{ text: "Loved your portfolio, let's collab on the fall shoot!", time: "10:42 AM" }],
        },
        {
          id: "m_2",
          name: "Jordan Rivera",
          type: "Cinematographer",
          img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
          online: false,
          bio: "Shooting on 35mm & Alexa Mini. Indie films & commercials.",
          location: "Los Angeles, CA",
          distanceMi: 12,
          zodiac: "Scorpio",
          messages: [{ text: "Hey! Are you free for a test shoot this weekend?", time: "Yesterday" }],
        },
        {
          id: "m_3",
          name: "Riley Patel",
          type: "Creative Technologist",
          img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
          online: true,
          bio: "Generative visuals, shader art & interactive installations.",
          location: "San Francisco, CA",
          distanceMi: 8,
          zodiac: "Aquarius",
          messages: [{ text: "Sent an attachment", time: "2d ago" }],
        },
      ];

      const mockLikedBy = [
        {
          id: "l_1",
          name: "Avery Nguyen",
          type: "Art Director",
          img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600",
        },
        {
          id: "l_2",
          name: "Kai Tanaka",
          type: "Sound Designer",
          img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600",
        },
      ];

      localStorage.setItem("muse_age_verified", "true");
      localStorage.setItem("muse_onboarded", "true");
      localStorage.setItem("muse_safety_acknowledged", "true");
      localStorage.setItem("muse_user", JSON.stringify({ access_token: "mock_jwt_token", user: mockUser }));
      localStorage.setItem(
        "muse_state",
        JSON.stringify({
          authUser: mockUser,
          screen: "discover",
          currentUser: 0,
          matches: mockMatches,
          likedBy: mockLikedBy,
        })
      );
    });

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Wait for splash screen to fade out and main app to mount
    await page.waitForTimeout(4000);

    // 1. Discover tab
    await page.screenshot({ path: path.join(SCREEN_DIR, `${vp.name}_01_discover.png`), fullPage: false });

    // 1b. Open Discover FAB radial menu and capture
    const fabBtn = page.locator('.match-fab-btn');
    if ((await fabBtn.count()) > 0) {
      await fabBtn.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREEN_DIR, `${vp.name}_01b_discover_radial.png`), fullPage: false });
    }

    // 2. Feed tab
    const feedBtn = page.locator('.screen-el.active .nav button.nav-item:has-text("Feed")');
    if ((await feedBtn.count()) > 0) {
      await feedBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREEN_DIR, `${vp.name}_02_feed.png`), fullPage: false });
    }

    // 3. Muses tab
    const musesBtn = page.locator('.screen-el.active .nav button.nav-item:has-text("Muses")');
    if ((await musesBtn.count()) > 0) {
      await musesBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREEN_DIR, `${vp.name}_03_muses.png`), fullPage: false });
    }

    // 4. BTS tab
    const btsBtn = page.locator('.screen-el.active .nav button.nav-item:has-text("BTS")');
    if ((await btsBtn.count()) > 0) {
      await btsBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREEN_DIR, `${vp.name}_04_bts.png`), fullPage: false });
    }

    // 5. Collab tab
    const collabBtn = page.locator('.screen-el.active .nav button.nav-item:has-text("Collab")');
    if ((await collabBtn.count()) > 0) {
      await collabBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREEN_DIR, `${vp.name}_05_collab.png`), fullPage: false });
    }

    // 6. Menu panel
    const menuBtn = page.locator('.screen-el.active .nav button.nav-item:has-text("Menu")');
    if ((await menuBtn.count()) > 0) {
      await menuBtn.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREEN_DIR, `${vp.name}_06_menu.png`), fullPage: false });
      // Close menu
      const closeBtn = page.locator('.hamburger-close');
      if ((await closeBtn.count()) > 0) {
        await closeBtn.first().click();
        await page.waitForTimeout(500);
      }
    }

    // 7. Muses -> Chat screen
    if ((await musesBtn.count()) > 0) {
      await musesBtn.first().click();
      await page.waitForTimeout(1000);
      const firstCard = page.locator('.match-card');
      if ((await firstCard.count()) > 0) {
        await firstCard.first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREEN_DIR, `${vp.name}_07_chat.png`), fullPage: false });
        // Back to matches
        const chatBack = page.locator('.chat-back');
        if ((await chatBack.count()) > 0) {
          await chatBack.first().click();
          await page.waitForTimeout(500);
        }
      }
    }

    await context.close();
  }

  await browser.close();
  if (child) {
    child.kill("SIGTERM");
  }
  console.log("All screenshots captured in", SCREEN_DIR);
  process.exit(0);
}

capture().catch((e) => {
  console.error("Capture error:", e);
  process.exit(1);
});
