import { describe, it, expect, vi, beforeEach } from "vitest";

// auth.getUser (anon supabase) + getServiceClient (service). Hoisting-safe via globalThis.
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: async () => (globalThis as any).__authUser || { data: { user: null } } } },
  getServiceClient: () => (globalThis as any).__sbMock,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/questEngine", () => ({ setReferralQuestProgress: async () => ({}) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("stripe", () => ({ default: function () { return {}; } }));

import { POST } from "@/app/api/muse/referral/route";

const state: any = { tables: {}, updates: [], inserts: [], selects: [] };
(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      update: (v: any) => { state.updates.push({ tbl, v }); return q; },
      insert: (v: any) => { state.inserts.push({ tbl, v }); return q; },
      eq: () => q,
      maybeSingle: async () => ({ data: state.tables[tbl] ?? null }),
      single: async () => ({ data: state.tables[tbl] ?? null }),
    };
    return q;
  },
};

function req(body: unknown, token = "tok") {
  return { headers: { get: (n: string) => (n.toLowerCase() === "authorization" ? "Bearer " + token : n.toLowerCase() === "content-type" ? "application/json" : null) }, json: async () => body } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).__authUser = { data: { user: { id: "u1" } } };
  state.tables = {}; state.updates = []; state.inserts = [];
});

describe("referral route (integration)", () => {
  it("rejects a missing token with 401", async () => {
    const r = await POST(req({ action: "generate" }, ""));
    expect(r.status).toBe(401);
  });

  it("returns the existing code when already generated (no dup)", async () => {
    state.tables.muse_profiles = { id: "p1", name: "Ada", email: "a@x.com", referral_code: "ADA123", tier: "free", referred_by: null };
    const r = await POST(req({ action: "generate" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.code).toBe("ADA123");
    expect(body.existing).toBe(true);
  });

  it("rejects missing referralCode for apply with 400", async () => {
    state.tables.muse_profiles = { id: "p1", name: "Ada", email: "a@x.com", referral_code: null, tier: "free", referred_by: null };
    const r = await POST(req({ action: "apply" }));
    expect(r.status).toBe(400);
  });

  it("rejects applying when already referred with 400", async () => {
    state.tables.muse_profiles = { id: "p1", name: "Ada", email: "a@x.com", referral_code: null, tier: "free", referred_by: "r1" };
    const r = await POST(req({ action: "apply", referralCode: "BOB1" }));
    expect(r.status).toBe(400);
  });
});
