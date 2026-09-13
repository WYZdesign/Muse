import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: async (token: string) => (globalThis as any).__authUser || { data: { user: null } } } },
  getServiceClient: () => (globalThis as any).__sbMock,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/money", () => ({ parseRateToCents: (s: string) => parseInt(s.replace(/[^0-9]/g, "")) || 0 }));
vi.mock("@/lib/config", () => ({
  MUSE_HOST_COMMISSION_RATE: 0.07,
  MUSE_BUYER_SERVICE_FEE_RATE: 0.08,
}));
vi.mock("@/lib/muse-actions/shared", () => ({ isAgeVerificationCurrent: () => true }));
vi.mock("stripe", () => ({
  default: function () {
    return {
      accounts: {
        create: async () => ({ id: "acct_123", type: "express" }),
        retrieve: async () => ({ id: "acct_123", charges_enabled: true, payouts_enabled: true }),
      },
      accountLinks: {
        create: async () => ({ url: "https://connect.stripe.com/express" }),
      },
      paymentIntents: {
        create: async (opts: any) => ({ id: "pi_123", client_secret: "cs_123", amount: opts.amount }),
      },
    };
  },
}));

import { POST } from "@/app/api/muse/connect/route";

const state: any = { tables: {}, inserts: [] };
(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      insert: (v: any) => { state.inserts.push({ tbl, v }); return q; },
      upsert: (v: any) => { state.inserts.push({ tbl, v }); return q; },
      update: (v: any) => { state.inserts.push({ tbl, v }); return q; },
      eq: () => q,
      maybeSingle: async () => ({ data: state.tables[tbl] ?? null }),
    };
    q.then = (resolve: any) => resolve({ data: null, error: null });
    return q;
  },
};

function req(body: unknown, token = "tok") {
  return {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "authorization" ? "Bearer " + token
        : n.toLowerCase() === "content-type" ? "application/json"
        : null,
    },
    json: async () => body,
    nextUrl: { origin: "https://muse.wyzdesign.com" },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  (globalThis as any).__authUser = { data: { user: { id: "u1" } } };
  state.tables = {};
  state.inserts = [];
});

describe("connect route", () => {
  it("rejects missing auth with 401", async () => {
    (globalThis as any).__authUser = { data: { user: null } };
    const r = await POST(req({ action: "account-status" }));
    expect(r.status).toBe(401);
  });

  it("returns 404 when profile not found", async () => {
    state.tables.muse_profiles = null;
    const r = await POST(req({ action: "account-status" }));
    expect(r.status).toBe(404);
  });

  it("returns 503 when Stripe not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    state.tables.muse_profiles = { id: "p1" };
    const r = await POST(req({ action: "account-status" }));
    expect(r.status).toBe(503);
  });

  it("create-account returns onboarding URL", async () => {
    state.tables.muse_profiles = { id: "p1" };
    const r = await POST(req({ action: "create-account" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.onboardingUrl).toContain("connect.stripe.com");
  });

  it("rejects unknown action with 400", async () => {
    state.tables.muse_profiles = { id: "p1" };
    const r = await POST(req({ action: "bogus" }));
    expect(r.status).toBe(400);
  });
});
