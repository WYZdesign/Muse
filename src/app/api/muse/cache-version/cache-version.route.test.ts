import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "@/app/api/muse/cache-version/route";

describe("cache-version route", () => {
  beforeEach(() => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
  });

  it("returns configured version with no-store", async () => {
    vi.stubEnv("MUSE_CACHE_VERSION", "42");
    const r = await GET();
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ version: "42" });
  });

  it("defaults to 0 when env unset", async () => {
    vi.stubEnv("MUSE_CACHE_VERSION", "");
    const r = await GET();
    expect(await r.json()).toEqual({ version: "0" });
  });
});
