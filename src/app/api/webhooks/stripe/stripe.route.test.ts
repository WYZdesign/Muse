import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Hoisting-safe mocks: "stripe" + "supabase" + "email" factories reference only
// globalThis-backed holders (vi.mock is hoisted above top-level consts).

type MockStripeEvent = { type: string; data: { object: Record<string, unknown> } };
type FakeStripeInstance = {
  webhooks: { constructEvent: () => MockStripeEvent };
  subscriptions: { list: (opts: unknown) => Promise<{ data: unknown[] }>; cancel: (id: unknown) => Promise<unknown> };
};
type StripeTableValue = Record<string, unknown> | null;
type StripeSbQuery = {
  select: () => StripeSbQuery;
  update: (v: Record<string, unknown>) => StripeSbQuery;
  insert: (v: unknown[]) => StripeSbQuery;
  eq: () => StripeSbQuery;
  in: () => StripeSbQuery;
  maybeSingle: () => Promise<{ data: StripeTableValue }>;
  single: () => Promise<{ data: StripeTableValue }>;
};
type StripeSbMock = { from: (tbl: string) => StripeSbQuery };
type StripeTestGlobals = {
  __mockStripeEvent?: MockStripeEvent | null;
  __sbMock?: StripeSbMock;
};

const TG = globalThis as unknown as StripeTestGlobals;

vi.mock("stripe", () => ({
  default: function (this: FakeStripeInstance) {
    const getEvent = () => (globalThis as unknown as StripeTestGlobals).__mockStripeEvent;
    this.webhooks = { constructEvent: () => {
      const ev = getEvent();
      if (!ev) throw new Error("Invalid signature");
      return ev;
    } };
    this.subscriptions = { list: async () => ({ data: [] }), cancel: async () => ({}) };
    return this;
  },
}));

vi.mock("@/lib/supabase", () => ({ getServiceClient: () => (globalThis as unknown as StripeTestGlobals).__sbMock }));

vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: unknown[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));

import { POST } from "@/app/api/webhooks/stripe/route";

const state: { tables: Record<string, StripeTableValue>; updates: { tbl: string; v: Record<string, unknown> }[]; inserts: { tbl: string; v: unknown[] }[] } = { tables: {}, updates: [], inserts: [] };
TG.__sbMock = {
  from: (tbl: string) => {
    const q: StripeSbQuery = {
      select: () => q,
      update: (v: Record<string, unknown>) => { state.updates.push({ tbl, v }); return q; },
      insert: (v: unknown[]) => { state.inserts.push({ tbl, v }); return q; },
      eq: () => q,
      in: () => q,
      maybeSingle: async () => ({ data: state.tables[tbl] ?? null }),
      single: async () => ({ data: state.tables[tbl] ?? null }),
    };
    return q;
  },
};

function req(body: string, sig = "t=1,v1=abc") {
  return { headers: { get: (n: string) => (n === "stripe-signature" ? sig : null) }, text: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  TG.__mockStripeEvent = null;
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
    TG.__mockStripeEvent = null; // constructEvent throws
    const r = await POST(req("{}", "t=1,v1=bad"));
    expect(r.status).toBe(400);
  });

  it("grants both-sided referral reward on subscription checkout", async () => {
    state.tables.muse_profiles = { id: "p1", email: "user@example.com", referred_by: "r1" };
    state.tables.muse_referrals = { id: "ref1", referee_id: "p1", referrer_id: "r1", status: "pending" };
    TG.__mockStripeEvent = { type: "checkout.session.completed", data: { object: { client_reference_id: "u1", payment_intent: null } } };
    const r = await POST(req("{}"));
    expect(r.status).toBe(200);
    const refUpsert = state.updates.find((u) => u.tbl === "muse_referrals")!;
    expect(refUpsert).toBeTruthy();
    expect(refUpsert.v.status).toBe("reward_issued");
    const rewardInsert = state.inserts.find((i) => i.tbl === "muse_referral_rewards");
    expect((rewardInsert?.v || []).length).toBe(2);
  });

  it("is idempotent — skips a referral already reward_issued", async () => {
    state.tables.muse_profiles = { id: "p1", email: "user@example.com", referred_by: "r1" };
    state.tables.muse_referrals = { id: "ref1", referee_id: "p1", referrer_id: "r1", status: "reward_issued" };
    TG.__mockStripeEvent = { type: "checkout.session.completed", data: { object: { client_reference_id: "u1", payment_intent: null } } };
    const r = await POST(req("{}"));
    expect(r.status).toBe(200);
    const rewardInsert = state.inserts.find((i) => i.tbl === "muse_referral_rewards");
    expect((rewardInsert?.v || []).length).toBe(0);
  });

  it.each([
    ["muse", "muse_pro"],
    ["sovereign", "muse_pro"],
    ["muse_pro", "muse_pro"],
    ["muse_studio", "muse_studio"],
    ["unknown-plan", "muse_pro"],
  ])("persists the canonical tier for checkout plan %s", async (requestedPlan, expectedTier) => {
    TG.__mockStripeEvent = {
      type: "checkout.session.completed",
      data: { object: { client_reference_id: "u1", payment_intent: null, metadata: { plan: requestedPlan } } },
    };

    const r = await POST(req("{}"));

    expect(r.status).toBe(200);
    expect(state.updates.find((u) => u.tbl === "muse_profiles")?.v.tier).toBe(expectedTier);
  });
});
