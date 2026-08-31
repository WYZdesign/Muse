import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Regression coverage for a bug found in the field: the origin allowlist
// used to be built from getMuseUrl() (`${base}/muse`) instead of the bare
// origin. A browser's `Origin` header never includes a path, so the
// allowlist never matched a real request and every same-origin, non-GET
// /api/* call (referral, messaging, swipes, posts — anything through the
// main /api/muse dispatcher) was silently rejected with 403 in production,
// while GET requests kept working fine, making it look like isolated feature
// bugs instead of a site-wide origin-check bug.
describe("proxy (origin / CORS middleware)", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  async function loadProxy() {
    const mod = await import("./proxy");
    return mod.default;
  }

  function req(opts: { method: string; path: string; origin?: string; referer?: string }) {
    const headers: Record<string, string> = {};
    if (opts.origin !== undefined) headers["origin"] = opts.origin;
    if (opts.referer !== undefined) headers["referer"] = opts.referer;
    return new NextRequest(`https://muse.wyzdesign.com${opts.path}`, {
      method: opts.method,
      headers,
    });
  }

  it("allows a same-origin POST from the app's own production origin (regression: used to 403)", async () => {
    const proxy = await loadProxy();
    const res = proxy(req({ method: "POST", path: "/api/muse/referral", origin: "https://muse.wyzdesign.com" }));
    expect(res.status).not.toBe(403);
  });

  it("allows a same-origin POST identified only via Referer (no Origin header)", async () => {
    const proxy = await loadProxy();
    const res = proxy(req({ method: "POST", path: "/api/muse", referer: "https://muse.wyzdesign.com/muse/discover" }));
    expect(res.status).not.toBe(403);
  });

  it("still blocks a POST from an untrusted cross-origin site", async () => {
    const proxy = await loadProxy();
    const res = proxy(req({ method: "POST", path: "/api/muse/referral", origin: "https://evil.example.com" }));
    expect(res.status).toBe(403);
  });

  it("respects NEXT_PUBLIC_APP_URL when set to a non-default origin", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.muse.example.com";
    vi.resetModules();
    const mod = await import("./proxy");
    const proxy = mod.default;
    const res = proxy(new NextRequest("https://staging.muse.example.com/api/muse", {
      method: "POST",
      headers: { origin: "https://staging.muse.example.com" },
    }));
    expect(res.status).not.toBe(403);
  });

  it("does not gate GET requests behind the origin check", async () => {
    const proxy = await loadProxy();
    const res = proxy(req({ method: "GET", path: "/api/muse/landing-stats", origin: "https://evil.example.com" }));
    expect(res.status).not.toBe(403);
  });

  it("always allows auth endpoints regardless of origin (login from any device)", async () => {
    const proxy = await loadProxy();
    const res = proxy(req({ method: "POST", path: "/api/muse/auth", origin: "https://evil.example.com" }));
    expect(res.status).not.toBe(403);
  });

  it("sets a valid (path-free) Access-Control-Allow-Origin on API responses", async () => {
    const proxy = await loadProxy();
    const res = proxy(req({ method: "GET", path: "/api/muse/landing-stats", origin: "https://muse.wyzdesign.com" }));
    const acao = res.headers.get("Access-Control-Allow-Origin");
    expect(acao).toBe("https://muse.wyzdesign.com");
    expect(acao?.endsWith("/muse")).toBe(false);
  });
});
