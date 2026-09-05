import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisting-safe mocks: "stripe" + "supabase" + "email" factories reference only
// globalThis-backed holders (vi.mock is hoisted above top-level consts).

vi.mock("stripe", () => ({
  default: function (this: any) {
    const getEvent = () => (globalThis as any).__mockStripeEvent;
    this.webhooks = { constructEvent: () => {
      const ev = getEvent();
      if (!ev) throw new Error("Invalid signature");
      return ev;
    } };
    this.subscriptions = { list: async () => ({ data: [] }), cancel: async () => ({}) };
    return this;
  },
}));

vi.mock("@/lib/supabase", () => ({ getServiceClient: () => (globalThis as any).__sbMock }));

vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));

import { POST } from "@/app/api/webhooks/stripe/route";

const state: any = { tables: {}, updates: [], inserts: [] };
(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      update: (v: any) => { state.updates.push({ tbl, v }); return q; },
      insert: (v: any) => { state.inserts.push({ tbl, v }); return q; },
      eq: () => q,
      in: () => q,
      maybeSingle: async () => ({ data: state.tables[tbl] ?? null }),
      single: async () => ({ data: state.tables[tbl] ?? null }),
    };
    return q;
  },
};

function req(body: string, sig = "t=1,v1=abc") {
  return { headers: { get: (n: string) => (n === "stripe-signature" ? sig : null) }, text: async () => body } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).__mockStripeEvent = null;
  state.tables = {}; state.updates = []; state.inserts = [];
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_SECRET_KEY = "sk_test";
});

describe("stripe webhook (integration)", () => {
  it("rejects a missing signature with 401", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "";
    const r = await POST(req("{}", ""));
    expect(r.status).toBe(401);
  });

  it("rejects a bad signature with 400", async () => {
    (globalThis as any).__mockStripeEvent = null; // constructEvent throws
    const r = await POST(req("{}", "t=1,v1=bad"));
    expect(r.status).toBe(400);
  });

  it("grants both-sided referral reward on subscription checkout", async () => {
    state.tables.muse_profiles = { id: "p1", email: "user@example.com", referred_by: "r1" };
    state.tables.muse_referrals = { id: "ref1", referee_id: "p1", referrer_id: "r1", status: "pending" };
    (globalThis as any).__mockStripeEvent = { type: "checkout.session.completed", data: { object: { client_reference_id: "u1", payment_intent: null } } };
    const r = await POST(req("{}"));
    expect(r.status).toBe(200);
    const refUpsert = state.updates.find((u: any) => u.tbl === "muse_referrals");
    expect(refUpsert).toBeTruthy();
    expect(refUpsert.v.status).toBe("reward_issued");
    const rewardInsert = state.inserts.find((i: any) => i.tbl === "muse_referral_rewards");
    expect((rewardInsert?.v || []).length).toBe(2);
  });

  it("is idempotent — skips a referral already reward_issued", async () => {
    state.tables.muse_profiles = { id: "p1", email: "user@example.com", referred_by: "r1" };
    state.tables.muse_referrals = { id: "ref1", referee_id: "p1", referrer_id: "r1", status: "reward_issued" };
    (globalThis as any).__mockStripeEvent = { type: "checkout.session.completed", data: { object: { client_reference_id: "u1", payment_intent: null } } };
    const r = await POST(req("{}"));
    expect(r.status).toBe(200);
    const rewardInsert = state.inserts.find((i: any) => i.tbl === "muse_referral_rewards");
    expect((rewardInsert?.v || []).length).toBe(0);
  });
});
