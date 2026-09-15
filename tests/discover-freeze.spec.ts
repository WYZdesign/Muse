import { test, expect } from "@playwright/test";

/**
 * Regression test for the "app-wide freeze" bug (fixed alongside
 * lib/safe-observer.ts): a MutationObserver on document.body whose own
 * callback (classList.add('waves-visible') + a whole-document
 * querySelectorAll) could be retriggered by ANY class/DOM churn anywhere
 * in the app, not just on Discover — creating a native-code microtask
 * storm that pegs the main thread with zero thrown errors. Reported as
 * "freezes after login", "froze ~2s into Discover", "black screen".
 *
 * Once that kind of storm is running, the page stops responding to
 * literally everything — script injection, screenshots, even DevTools —
 * which makes it unrecoverable from the same page's own JS. So this test
 * doesn't try to detect a hang after the fact; it proves the storm can't
 * start: it forces heavy, sustained DOM churn (the exact trigger — many
 * class/childList mutations in quick succession, simulating toasts,
 * badges, and animations elsewhere in the app while Discover is mounted)
 * and asserts the page stays responsive throughout.
 *
 * If this regresses (a future edit reintroduces an unscoped, unguarded
 * MutationObserver, or removes the safe-observer circuit breaker), this
 * test should time out / fail rather than passing silently — a hung page
 * fails Playwright's own actionability timeouts, which is the signal.
 */
test.describe("Discover freeze regression", () => {
  test("stays responsive under heavy DOM churn while mounted", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/muse", { waitUntil: "domcontentloaded", timeout: 20000 });
    await expect(page.locator(".app, .phone, main, .scene").first()).toBeVisible({ timeout: 15000 });

    // Simulate sustained, high-frequency DOM churn elsewhere in the app —
    // exactly the condition (mounting/toasts/badges/animations anywhere on
    // the page) that used to retrigger the buggy observer's whole-document
    // querySelectorAll on every single mutation.
    await page.evaluate(async () => {
      const host = document.createElement("div");
      host.id = "__freeze_test_churn_host";
      host.style.position = "fixed";
      host.style.top = "-9999px";
      document.body.appendChild(host);
      for (let i = 0; i < 300; i++) {
        const el = document.createElement("span");
        el.className = i % 2 === 0 ? "churn-a" : "churn-b";
        host.appendChild(el);
        if (host.childNodes.length > 20) host.removeChild(host.firstChild!);
        if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      host.remove();
    });

    // If the main thread is still alive, a trivial evaluate() round-trips
    // fast. A wedged/hung page (the storm) would time out here instead.
    const start = Date.now();
    const stillResponsive = await Promise.race([
      page.evaluate(() => document.readyState).then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[discover-freeze] post-churn evaluate round-trip: ${elapsed}ms`);

    expect(stillResponsive).toBe(true);
    expect(elapsed).toBeLessThan(2000);
    expect(errors).toEqual([]);
  });
});
