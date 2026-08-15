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
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

      const resp = await page.goto(p.path, { waitUntil: "networkidle" });
      expect(resp?.status()).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
      // Legal/SEO pages must not be blank.
      expect(errors).toEqual([]);
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
