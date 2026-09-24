import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/oauth-state", () => ({
  signState: vi.fn(() => "signed-state"),
  verifyState: vi.fn(() => null),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async (token: string) =>
        token === "bad"
          ? { data: { user: null }, error: null }
          : { data: { user: { id: "auth-1" } }, error: null },
      ),
    },
  },
  getServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "muse_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => (globalThis as any).__profile || { data: null, error: null },
            }),
          }),
        };
      }
      if (table === "muse_social_connections") {
        return {
          select: () => ({
            eq: async () => ({
              data: (globalThis as any).__conns || [],
              error: null,
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      return {};
    },
  })),
}));

import { GET } from "@/app/api/muse/social/route";

function req(search: string, headers: Record<string, string> = {}) {
  return {
    url: `https://muse.test/api/muse/social${search}`,
    headers: { get: (n: string) => headers[n] ?? null },
  } as any;
}

describe("social oauth route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    (globalThis as any).__profile = { data: { id: "p1" }, error: null };
    (globalThis as any).__conns = [{ provider: "spotify" }];
  });

  it("401 without bearer", async () => {
    const r = await GET(req("?action=status"));
    expect(r.status).toBe(401);
  });

  it("401 on invalid bearer", async () => {
    const r = await GET(req("?action=status", { authorization: "Bearer bad" }));
    expect(r.status).toBe(401);
  });

  it("status returns connected map (works in demo)", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await GET(req("?action=status", { authorization: "Bearer tok" }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      connected: { instagram: false, facebook: false, spotify: true, soundcloud: false },
    });
  });

  it("auth in demo mode → 409", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await GET(req("?provider=instagram&action=auth", { authorization: "Bearer tok" }));
    expect(r.status).toBe(409);
    expect((await r.json()).code).toBe("DEMO_MODE");
  });

  it("auth without provider → 400 when live", async () => {
    const r = await GET(req("?action=auth", { authorization: "Bearer tok" }));
    expect(r.status).toBe(400);
  });

  it("auth 503 when provider OAuth not configured", async () => {
    const r = await GET(req("?provider=instagram&action=auth", { authorization: "Bearer tok" }));
    expect(r.status).toBe(503);
    expect((await r.json()).error).toMatch(/not configured/i);
  });

  it("disconnect succeeds when live", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "cid");
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "sec");
    vi.resetModules();
    const { GET: freshGET } = await import("@/app/api/muse/social/route");
    const r = await freshGET(req("?provider=spotify&action=disconnect", { authorization: "Bearer tok" }));
    expect(r.status).toBe(200);
    expect((await r.json()).success).toBe(true);
  });

  it("unknown action → 400 when live", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "cid");
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "sec");
    vi.resetModules();
    const { GET: freshGET } = await import("@/app/api/muse/social/route");
    const r = await freshGET(req("?provider=spotify&action=nope", { authorization: "Bearer tok" }));
    expect(r.status).toBe(400);
  });
});
