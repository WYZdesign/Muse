import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
}));
vi.mock("@/lib/oauth-state", () => ({
  verifyState: vi.fn(() => (globalThis as any).__state || null),
}));
vi.mock("@/lib/token-crypto", () => ({
  encryptToken: vi.fn((t: string) => `enc:${t}`),
  decryptToken: vi.fn((t: string) => t),
}));
vi.mock("@/lib/urls", () => ({
  getMuseUrl: vi.fn(() => "https://muse.test/muse"),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: {} },
  getServiceClient: vi.fn(() => ({
    from: () => ({
      upsert: async () => {
        (globalThis as any).__upserts ||= [];
        return { error: null };
      },
    }),
  })),
}));

import { GET } from "@/app/api/muse/social/callback/route";
import { verifyState } from "@/lib/oauth-state";
import { checkRate } from "@/lib/rate-limit";

function req(search: string) {
  return {
    url: `https://muse.test/api/muse/social/callback${search}`,
    headers: { get: () => null },
  } as any;
}

async function locationOf(r: any) {
  // NextResponse.redirect returns a Response with headers Location
  return r.headers?.get?.("location") || r.headers?.get?.("Location") || String(r.url || "");
}

describe("social callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    (globalThis as any).__state = null;
    (globalThis as any).__upserts = [];
  });

  it("redirects with demo_mode when demo", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await GET(req("?provider=instagram&code=x&state=y"));
    expect(await locationOf(r)).toContain("error=demo_mode");
  });

  it("redirects rate_limited when over limit", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await GET(req("?provider=instagram&code=x&state=y"));
    expect(await locationOf(r)).toContain("error=rate_limited");
  });

  it("redirects provider_missing without provider", async () => {
    const r = await GET(req("?code=x&state=y"));
    expect(await locationOf(r)).toContain("error=provider_missing");
  });

  it("propagates provider error query", async () => {
    const r = await GET(req("?provider=instagram&error=access_denied"));
    expect(await locationOf(r)).toContain("error=access_denied");
  });

  it("redirects invalid_callback without code/state", async () => {
    const r = await GET(req("?provider=instagram"));
    expect(await locationOf(r)).toContain("error=invalid_callback");
  });

  it("redirects invalid_state when verifyState returns null", async () => {
    (verifyState as any).mockReturnValueOnce(null);
    const r = await GET(req("?provider=instagram&code=x&state=bad"));
    expect(await locationOf(r)).toContain("error=invalid_state");
  });

  it("redirects provider_mismatch when state.provider differs", async () => {
    (globalThis as any).__state = { profileId: "p1", provider: "spotify", ts: Date.now() };
    const r = await GET(req("?provider=instagram&code=x&state=ok"));
    expect(await locationOf(r)).toContain("error=provider_mismatch");
  });
});
