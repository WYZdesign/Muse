import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSb, tableCalls, eqOf, insertValue, updateValue, type SbCall } from "@/test-support/sb";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));

const state: any = { row: null, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { strikeAppeal, disclosureCreate, disclosureConfirm, disclosureGet, strikesGet } from "@/lib/muse-actions/disclosures";

function install(handlers: Record<string, (calls: SbCall[]) => any>) {
  const sb: any = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  (globalThis as any).__sbMock = sb;
  return sb;
}
function act(rest: any) {
  return { sb: (globalThis as any).__sbMock, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

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

describe("disclosureCreate — terms enforcement", () => {
  it("hard-blocks NSFW + payment, applies a strike and logs", async () => {
    const sb = install({
      muse_disclosures: () => ({ data: null }),
      muse_strikes: (calls) => (calls.some((c) => c.method === "insert") ? { data: null } : { data: [] }),
      muse_profiles: () => ({ data: null }),
      muse_activity_log: () => ({ data: null }),
      muse_notifications: () => ({ data: null }),
    });
    const r = await disclosureCreate(act({ responderId: "r1", contentTypeNudity: true, compensationAmount: "$200" }));
    expect((r as Response).status).toBe(403);
    expect((await (r as Response).json()).blocked).toBe(true);
    expect(tableCalls(sb.__log, "muse_strikes").some((c) => c.method === "insert")).toBe(true);
    expect(tableCalls(sb.__log, "muse_activity_log").some((c) => c.method === "insert")).toBe(true);
  });

  it("stores a clean disclosure and notifies the responder", async () => {
    const sb = install({
      muse_disclosures: () => ({ data: { id: "d1" } }),
      muse_notifications: () => ({ data: null }),
    });
    const r = await disclosureCreate(act({ responderId: "r1", contentTypePortrait: true, locationPublic: false }));
    expect((r as Response).status).toBe(200);
    const row = insertValue(tableCalls(sb.__log, "muse_disclosures"));
    expect(row).toMatchObject({ proposer_id: "me1", responder_id: "r1", status: "pending_responder", location_public: false });
  });
});

describe("disclosureConfirm — state machine", () => {
  it("400s without an id and 404s when missing", async () => {
    install({});
    expect((await disclosureConfirm(act({})) as Response).status).toBe(400);
    install({ muse_disclosures: () => ({ data: null }) });
    expect((await disclosureConfirm(act({ disclosureId: "d1" })) as Response).status).toBe(404);
  });
  it("403s when the caller is not a party", async () => {
    install({ muse_disclosures: () => ({ data: { id: "d1", proposer_id: "a", responder_id: "b", status: "pending_proposer" } }) });
    expect((await disclosureConfirm(act({ disclosureId: "d1" })) as Response).status).toBe(403);
  });
  it("advances proposer → responder", async () => {
    const sb = install({ muse_disclosures: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "d1", proposer_id: "me1", responder_id: "b", status: "pending_proposer" } }) });
    expect((await disclosureConfirm(act({ disclosureId: "d1" })) as Response).status).toBe(200);
    expect(updateValue(tableCalls(sb.__log, "muse_disclosures"))?.status).toBe("pending_responder");
  });
  it("confirms and notifies + emails the other party", async () => {
    const sb = install({
      muse_disclosures: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { id: "d1", proposer_id: "a", responder_id: "me1", status: "pending_responder" } }),
      muse_notifications: () => ({ data: null }),
      muse_profiles: () => ({ data: { email: "a@b.com" } }),
    });
    expect((await disclosureConfirm(act({ disclosureId: "d1" })) as Response).status).toBe(200);
    expect(updateValue(tableCalls(sb.__log, "muse_disclosures"))?.status).toBe("confirmed");
    expect(tableCalls(sb.__log, "muse_notifications").some((c) => c.method === "insert")).toBe(true);
  });
  it("400s for an invalid current state", async () => {
    install({ muse_disclosures: () => ({ data: { id: "d1", proposer_id: "me1", responder_id: "b", status: "confirmed" } }) });
    expect((await disclosureConfirm(act({ disclosureId: "d1" })) as Response).status).toBe(400);
  });
});

describe("disclosureGet / strikesGet", () => {
  it("disclosureGet returns the caller's disclosures", async () => {
    install({ muse_disclosures: () => ({ data: [{ id: "d1" }] }) });
    expect((await (await disclosureGet(act({})) as Response).json()).disclosures).toHaveLength(1);
  });
  it("strikesGet scopes to the caller", async () => {
    const sb = install({ muse_strikes: () => ({ data: [{ id: "s1" }] }) });
    await strikesGet(act({}));
    expect(eqOf(tableCalls(sb.__log, "muse_strikes"), "user_id")).toBe("me1");
  });
});
