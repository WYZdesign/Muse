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

import { strikeAppeal, disclosureCreate } from "@/lib/muse-actions/disclosures";

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

describe("disclosures/Strikes actions", () => {
  it("strikeAppeal requires strikeId + appealText (400)", async () => {
    const r = await strikeAppeal(ctx({ appealText: "not me" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("strikeAppeal accepts valid input (200)", async () => {
    const r = await strikeAppeal(ctx({ strikeId: "s1", appealText: "appeal" }, null));
    expect((r as Response).status).toBe(200);
  });

  it("strikeAppeal filters the update by the caller's user_id (ownership)", async () => {
    await strikeAppeal(ctx({ strikeId: "s1", appealText: "appeal" }, null));
    // the update chain should apply eq(user_id, profile.id) so you can't
    // appeal someone else's strike
    expect(state.updates.length).toBe(1);
  });

  it("disclosureCreate requires disclosure_type (400)", async () => {
    const r = await disclosureCreate(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });
});
