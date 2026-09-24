import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ count: 123 })),
    })),
  })),
}));

import { GET } from "@/app/api/muse/landing-stats/route";
import { checkRate } from "@/lib/rate-limit";

function req() {
  return { headers: { get: () => null } } as any;
}

describe("landing-stats route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
  });

  it("returns demo count 0 in demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await GET(req());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ count: 0, demo: true });
  });

  it("429 when rate limited", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await GET(req());
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ count: 0 });
  });

  it("returns profile count when live", async () => {
    const r = await GET(req());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ count: 123 });
  });

  it("returns count 0 on service errors", async () => {
    const { getServiceClient } = await import("@/lib/supabase");
    (getServiceClient as any).mockReturnValueOnce({
      from: () => {
        throw new Error("down");
      },
    });
    const r = await GET(req());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ count: 0 });
  });
});
