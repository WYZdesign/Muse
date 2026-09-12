import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: async (token: string) => {
        if (!token) return { data: { user: null }, error: { message: "No token" } };
        return (globalThis as any).__authUser || { data: { user: null }, error: { message: "Invalid" } };
      },
      mfa: {
        listFactors: async () => (globalThis as any).__factors || { data: { totp: [] } },
        enroll: async (opts: any) => (globalThis as any).__enrollResult || { data: { id: "f1", type: "totp", totp: { secret: "s1", qr_code: "otpauth://..." } } },
        challenge: async (opts: any) => (globalThis as any).__challengeResult || { data: { id: "ch1" } },
        verify: async (opts: any) => (globalThis as any).__verifyResult || { data: {} },
        unenroll: async (opts: any) => (globalThis as any).__unenrollResult || { data: {} },
      },
    },
  },
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "10.0.0.1" }));

import { GET, POST } from "@/app/api/muse/mfa/route";

function req(opts: { method: string; token?: string; body?: unknown; type?: string }) {
  const headers: Record<string, string> = {};
  if (opts.token) headers["authorization"] = "Bearer " + opts.token;
  headers["content-type"] = "application/json";
  const url = opts.type ? `https://muse.test/mfa?type=${opts.type}` : "https://muse.test/mfa";
  return new NextRequest(url, {
    method: opts.method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).__authUser = { data: { user: { id: "u1" } } };
  (globalThis as any).__factors = { data: { totp: [] } };
  (globalThis as any).__enrollResult = { data: { id: "f1", type: "totp", totp: { secret: "s1", qr_code: "otpauth://..." } } };
  (globalThis as any).__challengeResult = { data: { id: "ch1" } };
  (globalThis as any).__verifyResult = { data: {} };
  (globalThis as any).__unenrollResult = { data: {} };
});

describe("MFA route", () => {
  it("GET rejects missing token with 401", async () => {
    const r = await GET(req({ method: "GET" }));
    expect(r.status).toBe(401);
  });

  it("GET returns mfa-status with enabled=false when no factors", async () => {
    (globalThis as any).__factors = { data: { totp: [] } };
    const r = await GET(req({ method: "GET", token: "tok", type: "mfa-status" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.enabled).toBe(false);
  });

  it("GET returns mfa-status with enabled=true when verified factor exists", async () => {
    (globalThis as any).__factors = { data: { totp: [{ id: "f1", status: "verified", friendly_name: "Auth" }] } };
    const r = await GET(req({ method: "GET", token: "tok", type: "mfa-status" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.enabled).toBe(true);
    expect(body.factors).toHaveLength(1);
  });

  it("GET returns mfa-factors list", async () => {
    (globalThis as any).__factors = { data: { totp: [{ id: "f1", status: "verified" }] } };
    const r = await GET(req({ method: "GET", token: "tok", type: "mfa-factors" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.totp).toHaveLength(1);
  });

  it("POST rejects unknown action with 400", async () => {
    const r = await POST(req({ method: "POST", token: "tok", body: { action: "bogus" } }));
    expect(r.status).toBe(400);
  });

  it("POST enroll returns QR data", async () => {
    const r = await POST(req({ method: "POST", token: "tok", body: { action: "enroll" } }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.type).toBe("totp");
    expect(body.qr_uri).toBeTruthy();
  });

  it("POST verify requires factorId and code", async () => {
    const r = await POST(req({ method: "POST", token: "tok", body: { action: "verify" } }));
    expect(r.status).toBe(400);
  });

  it("POST verify succeeds with valid factorId and code", async () => {
    const r = await POST(req({ method: "POST", token: "tok", body: { action: "verify", factorId: "f1", code: "123456" } }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
  });

  it("POST unenroll requires factorId", async () => {
    const r = await POST(req({ method: "POST", token: "tok", body: { action: "unenroll" } }));
    expect(r.status).toBe(400);
  });

  it("POST challenge requires factorId", async () => {
    const r = await POST(req({ method: "POST", token: "tok", body: { action: "challenge" } }));
    expect(r.status).toBe(400);
  });

  it("GET returns 400 for unknown type", async () => {
    const r = await GET(req({ method: "GET", token: "tok", type: "bogus" }));
    expect(r.status).toBe(400);
  });
});
