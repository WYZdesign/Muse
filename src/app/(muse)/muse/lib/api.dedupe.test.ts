import { describe, it, expect, vi, afterEach } from "vitest";
import { authFetch, fetchWithTimeout } from "./api";

/**
 * Roadmap 1.2 — in-flight GET dedupe. Only concurrent identical GETs share a
 * call; entries clear on settle (no TTL) so later refetches are live.
 */
afterEach(() => vi.restoreAllMocks());

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("in-flight GET dedupe", () => {
  it("shares one network call across concurrent identical GETs and gives each a readable clone", async () => {
    let calls = 0;
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return ok({ n: calls });
    });
    const [a, b] = await Promise.all([authFetch("/api/x?type=feed"), authFetch("/api/x?type=feed")]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await a.json()).toEqual({ n: 1 });
    expect(await b.json()).toEqual({ n: 1 });
  });

  it("does not dedupe different URLs", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ n: 1 }));
    await Promise.all([authFetch("/api/a"), authFetch("/api/b")]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("does not dedupe non-GET requests", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ n: 1 }));
    await Promise.all([
      fetchWithTimeout("/api/x", { method: "POST", body: "{}" }),
      fetchWithTimeout("/api/x", { method: "POST", body: "{}" }),
    ]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("clears the entry after settling — a later call hits the network again", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ n: 1 }));
    await authFetch("/api/y");
    await authFetch("/api/y");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("shares a call for concurrent identical public GETs too", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return ok({ ok: true });
    });
    await Promise.all([fetchWithTimeout("/api/pub"), fetchWithTimeout("/api/pub")]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
