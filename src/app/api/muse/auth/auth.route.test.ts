import { describe, it, expect, vi, beforeEach } from "vitest";

// rate-limit fails CLOSED if Supabase isn't reachable. Register threshold is 5/IP;
// allow validation (400) to fire for the distinct-IP validation tests, and 429 after
// 5 for the "rate limits registration" test (uses ip 55.55.55.55). Per-IP counting.
const authCallsByIp = new Map<string, number>();
const { mockSignUp, mockGetUser } = vi.hoisted(() => ({ mockSignUp: vi.fn(), mockGetUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async (ip: string) => {
    const n = (authCallsByIp.get(ip) || 0) + 1;
    authCallsByIp.set(ip, n);
    return n <= 5;
  }),
  checkRateUser: vi.fn(async () => true),
  clientIp: vi.fn((r: any) => r?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "10.0.0.1"),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signUp: mockSignUp, getUser: mockGetUser } },
  getServiceClient: vi.fn(() => (globalThis as any).__authServiceMock || ({ auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } })),
  getAnonClient: vi.fn(() => ({})),
}));

import { POST } from "@/app/api/muse/auth/route";

function mockReq(body: unknown, ip = "10.0.0.1") {
  return {
    method: "POST",
    json: async () => body,
    headers: {
      get: (name: string) => {
        if (name === "content-type") return "application/json";
        if (name === "x-forwarded-for") return ip;
        return null;
      },
    },
  } as any;
}

describe("auth route (integration)", () => {
  beforeEach(() => { authCallsByIp.clear(); mockSignUp.mockReset(); mockGetUser.mockReset(); (globalThis as any).__authServiceMock = undefined; vi.stubEnv("MUSE_DEMO_MODE", "false"); });

  it("rejects missing email/password with 400", async () => {
    const r = await POST(mockReq({ action: "register" }));
    expect(r.status).toBe(400);
  });

  it("rejects an invalid email with 400", async () => {
    const r = await POST(mockReq({ action: "register", email: "not-an-email", password: "Strong!123" }));
    expect(r.status).toBe(400);
  });

  it("rejects a weak password (no capital) with 400", async () => {
    const r = await POST(mockReq({ action: "register", email: "user@example.com", password: "weakpass!1" }));
    expect(r.status).toBe(400);
  });

  it("rejects a weak password (no symbol) with 400", async () => {
    const r = await POST(mockReq({ action: "register", email: "user@example.com", password: "WeakPass123" }));
    expect(r.status).toBe(400);
  });

  it("rejects an overly long password with 400", async () => {
    const r = await POST(mockReq({ action: "register", email: "user@example.com", password: "A!1" + "x".repeat(300) }));
    expect(r.status).toBe(400);
  });

  it("rate limits registration after the threshold", async () => {
    const ip = "55.55.55.55";
    const mk = (body: unknown) => mockReq(body, ip);
    // Threshold for register is 5 per IP.
    let status = 200;
    for (let i = 0; i < 8; i++) {
      const r = await POST(mk({ action: "register", email: "rate@example.com", password: "Strong!123" }));
      status = r.status;
    }
    expect(status).toBe(429);
  });

  it("does not reveal an existing account during registration", async () => {
    // Supabase obfuscates an existing address as a user without identities
    // when email confirmation is enabled. The route must preserve that
    // neutral result rather than restoring a 409/email-exists oracle.
    mockSignUp.mockResolvedValue({ data: { user: { id: "opaque", identities: [] } }, error: null });
    const r = await POST(mockReq({ action: "register", email: "existing@example.com", password: "Strong!123" }));
    const body = await r.json();
    expect(r.status).toBe(202);
    expect(body).toMatchObject({ success: true, registrationPending: true });
    expect(JSON.stringify(body).toLowerCase()).not.toContain("already registered");
    expect(JSON.stringify(body).toLowerCase()).not.toContain("existing@example.com");
  });

  it("schedules account deletion for 30 days instead of deleting data immediately", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
    const updateEq = vi.fn(async () => ({ error: null }));
    const profileEq = vi.fn(() => ({ maybeSingle: async () => ({ data: { id: "profile-1", suspended: false }, error: null }) }));
    const update = vi.fn(() => ({ eq: updateEq }));
    (globalThis as any).__authServiceMock = { from: vi.fn(() => ({ select: () => ({ eq: profileEq }), update })) };

    const before = Date.now();
    const r = await POST(mockReq({ action: "delete-account", access_token: "token" }));
    const body = await r.json();

    expect(r.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ suspended: true, deletion_requested_at: expect.any(String), deletion_purge_after: expect.any(String) }));
    expect(new Date(body.deletionScheduledFor).getTime()).toBeGreaterThanOrEqual(before + 29 * 24 * 60 * 60 * 1000);
    expect(new Date(body.deletionScheduledFor).getTime()).toBeLessThanOrEqual(before + 31 * 24 * 60 * 60 * 1000);
  });
});
