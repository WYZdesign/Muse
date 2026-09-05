import { describe, it, expect, vi, beforeEach } from "vitest";

// rate-limit fails CLOSED if Supabase isn't reachable. Register threshold is 5/IP;
// allow validation (400) to fire for the distinct-IP validation tests, and 429 after
// 5 for the "rate limits registration" test (uses ip 55.55.55.55). Per-IP counting.
const authCallsByIp = new Map<string, number>();
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
  getServiceClient: vi.fn(() => ({ auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } })),
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
  beforeEach(() => { authCallsByIp.clear(); });

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
});
