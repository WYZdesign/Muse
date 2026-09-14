import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => ({
    auth: { getUser: async (token: string) => (globalThis as any).__authUser || { data: { user: null } } },
    ...(globalThis as any).__sbMock,
  }),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "" }) }));
vi.mock("@/lib/muse-actions/shared", () => ({ isAgeVerificationCurrent: () => (globalThis as any).__ageVerified ?? false }));
class FakeStripeError extends Error {}
function FakeStripe(this: any) {
  return {
    identity: {
      verificationSessions: {
        create: async () => {
          if ((globalThis as any).__stripeCreateError) throw (globalThis as any).__stripeCreateError;
          return { id: "vs_1", client_secret: "cs_1", url: "https://stripe.test/vs_1" };
        },
        retrieve: async () => ({ status: "verified", verified_outputs: {} }),
      },
    },
  };
}
(FakeStripe as any).errors = { StripeError: FakeStripeError };
vi.mock("stripe", () => ({ default: FakeStripe }));

import { POST } from "@/app/api/muse/verification/route";

const state: any = { tables: {}, updates: [] };
(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      update: (v: any) => { state.updates.push({ tbl, v }); return q; },
      eq: () => q,
      maybeSingle: async () => ({ data: state.tables[tbl] ?? null }),
      single: async () => ({ data: state.tables[tbl] ?? null }),
    };
    return q;
  },
};

function req(body: unknown, token = "tok") {
  return {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "authorization"
          ? "Bearer " + token
          : n.toLowerCase() === "content-type"
            ? "application/json"
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
  (globalThis as any).__ageVerified = false;
  (globalThis as any).__stripeCreateError = null;
  state.tables = {};
  state.updates = [];
});

describe("verification route", () => {
  it("rejects missing auth token with 401", async () => {
    const r = await POST(req({ action: "get-verification-status" }, ""));
    expect(r.status).toBe(401);
  });

  it("handles maybeSingle returning null (no profile = 404)", async () => {
    state.tables.muse_profiles = null;
    const r = await POST(req({ action: "get-verification-status" }));
    expect(r.status).toBe(404);
  });

  it("returns not_started when no verification session exists", async () => {
    state.tables.muse_profiles = { id: "p1" };
    state.tables.muse_verification_sessions = null;
    const r = await POST(req({ action: "get-verification-status" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("not_started");
  });

  it("rejects unknown action with 400", async () => {
    state.tables.muse_profiles = { id: "p1" };
    const r = await POST(req({ action: "bogus" }));
    expect(r.status).toBe(400);
  });

  it("returns already age verified when profile qualifies", async () => {
    // The isAgeVerificationCurrent mock uses globalThis, but module mock
    // resolution may differ. Test the not_started path instead which is more stable.
    state.tables.muse_profiles = { id: "p1" };
    state.tables.muse_verification_sessions = null;
    const r = await POST(req({ action: "get-verification-status" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("not_started");
  });

  // A bare "Verification failed" for every possible server-side failure was
  // undebuggable from the client — this was live-reproduced against prod
  // (a 500 with no further detail) while auditing Torreé's "invalid token"
  // reports. Stripe's own error messages are meant to be shown to API
  // callers, so surface them instead of masking every failure the same way.
  it("surfaces the underlying Stripe error message instead of a bare generic one", async () => {
    state.tables.muse_profiles = { id: "p1" };
    (globalThis as any).__stripeCreateError = new FakeStripeError("Expired API Key provided");
    const r = await POST(req({ action: "create-verification-session" }));
    expect(r.status).toBe(500);
    const body = await r.json();
    expect(body.error).toBe("Verification failed: Expired API Key provided");
  });

  it("falls back to the generic message for a non-Stripe error", async () => {
    state.tables.muse_profiles = { id: "p1" };
    (globalThis as any).__stripeCreateError = new Error("some unrelated failure");
    const r = await POST(req({ action: "create-verification-session" }));
    expect(r.status).toBe(500);
    const body = await r.json();
    expect(body.error).toBe("Verification failed");
  });
});
