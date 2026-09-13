import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));

const state: any = { row: null, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { preferencesSave, promoApply } from "@/lib/muse-actions/misc";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    delete: () => q, maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: any, row: any) {
  state.row = row;
  return { sb: { from: () => makeQuery() }, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; state.deletes = []; });

describe("misc actions", () => {
  it("promoApply requires a code (400)", async () => {
    const r = await promoApply(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("promoApply rejects an unknown code (404)", async () => {
    const r = await promoApply(ctx({ code: "NOTREAL" }, null));
    expect((r as Response).status).toBe(404);
  });

  it("promoApply lets a regular (non-admin) user redeem MUSEBETA — regression for the audit fix that removed the isAdminEmail gate this was previously (and wrongly) hidden behind", async () => {
    // ctx()'s profile has no email at all, so this would fail an admin check
    // if one were still present.
    const r = await promoApply(ctx({ code: "musebeta" }, null));
    expect((r as Response).status).toBe(200);
    const body = await (r as Response).json();
    expect(body.tier).toBe("muse_pro");
  });

  it("preferencesSave accepts valid prefs (200)", async () => {
    const r = await preferencesSave(ctx({ ageMin: 18, distance: 50 }, null));
    expect((r as Response).status).toBe(200);
  });
});
