import { test, expect } from "@playwright/test";

/**
 * Regression test for the "splash freeze" bug:
 * The app hung for >1s after splash on every page load, even on the
 * public landing page with no auth state. Root cause was an empty
 * `if (fromAuthStateChange)` re-entrancy guard in applySession() that
 * did nothing — setSession() -> SIGNED_IN -> applySession() -> setSession()
 * loop never broke. The fix: actually return/skip the redundant setSession
 * call inside the guard.
 *
 * This test verifies that the app shell becomes interactive within 1s of
 * networkidle on /muse, with a cold backend (slow /api/muse/auth).
 * For the cold backend case, we verify it doesn't hang indefinitely (>5s).
 */
test.describe("startup freeze regression", () => {
  test("app shell doesn't hang indefinitely on slow backend", async ({ page }) => {
    // Block /api/muse/auth to simulate a slow backend — the splash must
    // still resolve and the app must become interactive within 5s.
    await page.route("**/api/muse/auth", async (route) => {
      await new Promise(r => setTimeout(r, 3000)); // 3s delay
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: "slow backend" }) });
    });

    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

    const start = Date.now();
    await page.goto("/muse", { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for the app shell — the splash should clear and the app container
    // should become visible.
    const appShell = page.locator(".app, .phone, main, .scene").first();
    await expect(appShell).toBeVisible({ timeout: 15000 });

    const interactiveAt = Date.now() - start;
    console.log(`[startup-freeze] interactive at ${interactiveAt}ms`);

    // With a 3s backend delay, the app MUST become interactive within 5s
    // (not hang indefinitely as it did before the fix).
    expect(interactiveAt).toBeLessThan(5000);
    expect(errors.filter(e => !e.includes("slow backend"))).toEqual([]);
  });

  test("app shell becomes interactive within 1s on warm backend", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

    const start = Date.now();
    await page.goto("/muse", { waitUntil: "domcontentloaded", timeout: 30000 });

    const appShell = page.locator(".app, .phone, main, .scene").first();
    await expect(appShell).toBeVisible({ timeout: 15000 });

    const interactiveAt = Date.now() - start;
    console.log(`[startup-freeze] interactive at ${interactiveAt}ms (warm backend)`);

    expect(interactiveAt).toBeLessThan(1000);
    expect(errors.filter(e => !e.includes("slow backend"))).toEqual([]);
  });
});