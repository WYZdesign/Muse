import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithTimeout } from "./api";

/**
 * Roadmap 1.2 extension — short-TTL, mutation-invalidated GET cache. Opt-in per
 * call via `cacheTtlMs`; the whole cache clears on any non-GET so a write is
 * never followed by a stale read. Default (no cacheTtlMs) stays uncached.
 */
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("short-TTL GET cache", () => {
  it("serves a second GET from cache within the TTL", async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ n: 1 }));
    const a = await fetchWithTimeout("/api/c1", { cacheTtlMs: 1000 });
    const b = await fetchWithTimeout("/api/c1", { cacheTtlMs: 1000 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await a.json()).toEqual({ n: 1 });
    expect(await b.json()).toEqual({ n: 1 });
  });

  it("refetches after the TTL expires", async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ n: 1 }));
    await fetchWithTimeout("/api/c2", { cacheTtlMs: 1000 });
    vi.setSystemTime(2000);
    await fetchWithTimeout("/api/c2", { cacheTtlMs: 1000 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("clears the cache on any non-GET request", async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ n: 1 }));
    await fetchWithTimeout("/api/c3", { cacheTtlMs: 5000 });
    await fetchWithTimeout("/api/c3", { method: "POST", body: "{}" });
    await fetchWithTimeout("/api/c3", { cacheTtlMs: 5000 });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("does not cache without cacheTtlMs (default)", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ n: 1 }));
    await fetchWithTimeout("/api/c4");
    await fetchWithTimeout("/api/c4");
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
