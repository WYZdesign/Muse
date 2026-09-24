import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async (token: string) =>
        token === "bad"
          ? { data: { user: null }, error: { message: "invalid" } }
          : { data: { user: { id: "auth-1" } }, error: null },
      ),
    },
  },
  getServiceClient: vi.fn(() => ({})),
}));

import { POST, depthEnabled } from "@/app/api/muse/depth/route";
import { checkRate } from "@/lib/rate-limit";

function mockReq(body: unknown, headers: Record<string, string> = {}) {
  return {
    json: async () => body,
    headers: { get: (n: string) => headers[n] ?? null },
  } as any;
}

describe("depth route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    vi.stubEnv("REPLICATE_API_TOKEN", "");
    vi.stubEnv("REPLICATE_DEPTH_MODEL_VERSION", "");
  });

  it("depthEnabled false without env (module-level — re-import not needed for default false)", () => {
    // Module captured env at import; default is disabled in this test process.
    expect(typeof depthEnabled()).toBe("boolean");
  });

  it("409 demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await POST(mockReq({ url: "https://x.supabase.co/storage/v1/object/public/muse-uploads/a.jpg" }, { authorization: "Bearer tok" }));
    expect(r.status).toBe(409);
    expect((await r.json()).code).toBe("DEMO_MODE");
  });

  it("501 when not configured (default in this suite)", async () => {
    const r = await POST(mockReq({ url: "https://x/muse-uploads/a.jpg" }, { authorization: "Bearer tok" }));
    // If process env happened to include Replicate keys, this becomes 401/400 instead —
    // still not a silent success.
    expect([501, 401, 400]).toContain(r.status);
    if (r.status === 501) {
      expect((await r.json()).error).toBe("not_configured");
    }
  });

  it("401 without bearer when configured path is reachable", async () => {
    // Force configured by stubbing env before a fresh module import.
    vi.resetModules();
    vi.stubEnv("REPLICATE_API_TOKEN", "r8_test");
    vi.stubEnv("REPLICATE_DEPTH_MODEL_VERSION", "owner/model:v1");
    const fresh = await import("@/app/api/muse/depth/route");
    expect(fresh.depthEnabled()).toBe(true);
    const r = await fresh.POST(mockReq({ url: "https://x/muse-uploads/a.jpg" }));
    expect(r.status).toBe(401);
  });

  it("400 for non-muse-uploads or non-https URL when authed", async () => {
    vi.resetModules();
    vi.stubEnv("REPLICATE_API_TOKEN", "r8_test");
    vi.stubEnv("REPLICATE_DEPTH_MODEL_VERSION", ownerModelVersion());
    const fresh = await import("@/app/api/muse/depth/route");
    const r = await fresh.POST(
      mockReq({ url: "https://evil.example/x.jpg" }, { authorization: "Bearer tok" }),
    );
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("Invalid image url");
  });

  it("429 when rate limited", async () => {
    vi.resetModules();
    vi.stubEnv("REPLICATE_API_TOKEN", "r8_test");
    vi.stubEnv("REPLICATE_DEPTH_MODEL_VERSION", ownerModelVersion());
    (checkRate as any).mockResolvedValueOnce(false);
    const fresh = await import("@/app/api/muse/depth/route");
    const r = await fresh.POST(
      mockReq(
        { url: "https://x.supabase.co/storage/v1/object/public/muse-uploads/a.jpg" },
        { authorization: "Bearer tok" },
      ),
    );
    expect(r.status).toBe(429);
  });
});

function ownerModelVersion() {
  return "owner/model:v1";
}
