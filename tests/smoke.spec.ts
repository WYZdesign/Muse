import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/", note: "redirects to /muse" },
  { path: "/muse", note: "main app" },
  { path: "/muse/landing", note: "marketing landing" },
  { path: "/terms", note: "legal" },
  { path: "/privacy", note: "legal" },
  { path: "/dmca", note: "legal" },
  { path: "/safety", note: "legal" },
  { path: "/sitemap.xml", note: "seo" },
  { path: "/robots.txt", note: "seo" },
  { path: "/manifest.webmanifest", note: "pwa" },
];

test.describe("public pages load without errors", () => {
  for (const p of PAGES) {
    test(`${p.path} (${p.note})`, async ({ page }) => {
      const resp = await page.goto(p.path, { waitUntil: "domcontentloaded", timeout: 20000 });
      expect(resp?.status()).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }
});

test.describe("main app renders", () => {
  test("/muse shows the app shell (not white screen)", async ({ page }) => {
    await page.goto("/muse", { waitUntil: "domcontentloaded" });
    // The app mounts a scene + app container; wait for any main content.
    await expect(page.locator(".app, .phone, main, .scene").first()).toBeVisible({ timeout: 15000 });
  });

  test("/terms scrolls (overflow fix)", async ({ page }) => {
    await page.goto("/terms");
    const scrollable = await page.evaluate(() => {
      const el = document.querySelector("main") || document.body;
      return el.scrollHeight > window.innerHeight;
    });
    expect(scrollable).toBe(true);
  });
});

test.describe("API health", () => {
  test("/api/health returns ok", async ({ request }) => {
    const r = await request.get("/api/health");
    expect(r.status()).toBe(200);
  });

  test("/api/muse/landing-stats returns a count", async ({ request }) => {
    const r = await request.get("/api/muse/landing-stats");
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(typeof body.count).toBe("number");
  });
});

test.describe("hardening backstops", () => {
  test("/muse HTML is served with no-store", async ({ request }) => {
    const r = await request.get("/muse");
    expect(r.status()).toBe(200);
    expect(r.headers()["cache-control"]).toContain("no-store");
  });

  test("/muse/landing HTML is served with no-store", async ({ request }) => {
    const r = await request.get("/muse/landing");
    expect(r.status()).toBe(200);
    expect(r.headers()["cache-control"]).toContain("no-store");
  });

  test("/api/muse/cache-version returns a version (kill-switch)", async ({ request }) => {
    const r = await request.get("/api/muse/cache-version");
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(typeof body.version).toBe("string");
    expect(r.headers()["cache-control"]).toContain("no-store");
  });

  test("/api/backup rejects unauthenticated requests", async ({ request }) => {
    const r = await request.get("/api/backup");
    expect(r.status()).toBe(401);
  });

  test("/api/cron/checkins rejects unauthenticated requests", async ({ request }) => {
    const r = await request.get("/api/cron/checkins");
    expect(r.status()).toBe(401);
  });

  test("service worker uses network-first and never pre-caches /muse", async ({ request }) => {
    const r = await request.get("/sw-muse.js");
    expect(r.status()).toBe(200);
    const src = await r.text();
    // v5 (or newer) cache name
    expect(src).toMatch(/muse-shell-v/);
    // navigation is network-first
    expect(src).toContain('req.mode === "navigate"');
    // app shell is NOT in the pre-cache list
    expect(src).not.toMatch(/SHELL\s*=\s*\[[^\]]*"\/muse"/);
  });

  test("/muse/offline renders a recovery screen", async ({ page }) => {
    await page.goto("/muse/offline", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("You're offline")).toBeVisible({ timeout: 10000 });
  });
});
