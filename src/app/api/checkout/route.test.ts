import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The route checks STRIPE_SECRET_KEY before it parses the body; stub it so the
// validation paths are reachable.
beforeEach(() => vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy"));
afterEach(() => vi.unstubAllEnvs());

vi.mock("@/lib/demo-mode", () => ({ isDemoMode: vi.fn(() => true), demoModeUnavailable: (f: string) => ({ error: `${f} unavailable` }) }));
vi.mock("@/lib/rate-limit", () => ({ checkRate: vi.fn(async () => true), clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) } },
  getServiceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }),
}));
vi.mock("stripe", () => ({ default: class {} }));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { isDemoMode } from "@/lib/demo-mode";
import { checkRate } from "@/lib/rate-limit";

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new NextRequest("http://localhost/api/checkout", { method: "POST", body, headers }));

describe("POST /api/checkout", () => {
  it("returns 409 in demo mode", async () => {
    vi.mocked(isDemoMode).mockReturnValue(true);
    expect((await post('{"plan":"muse_pro"}')).status).toBe(409);
  });

  it("400s on malformed JSON (was a 500)", async () => {
    vi.mocked(isDemoMode).mockReturnValue(false);
    expect((await post("not-json")).status).toBe(400);
  });

  it("400s on an unknown plan", async () => {
    vi.mocked(isDemoMode).mockReturnValue(false);
    const res = await post('{"plan":"free_hack"}');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid plan");
  });

  it("401s when no session token is supplied for a valid plan", async () => {
    vi.mocked(isDemoMode).mockReturnValue(false);
    expect((await post('{"plan":"muse_pro"}')).status).toBe(401);
  });

  it("429s when rate limited", async () => {
    vi.mocked(isDemoMode).mockReturnValue(false);
    vi.mocked(checkRate).mockResolvedValueOnce(false);
    expect((await post('{"plan":"muse_pro"}')).status).toBe(429);
  });
});
