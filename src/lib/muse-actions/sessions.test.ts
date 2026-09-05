import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), setQuestProgress: async () => ({}), bumpLoginStreak: async () => ({}), setReferralQuestProgress: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), refreshMetaQuest: async () => ({}), getQuestDefinitions: () => [], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0 }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("stripe", () => ({ default: function () { return {}; } }));

const state: any = { rows: {}, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { bookingCancel, bookingRespond, sessionBook } from "@/lib/muse-actions/sessions";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, limit: () => q, order: () => q, range: () => q,
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    delete: () => q, or: () => q, maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: any, row: any) {
  state.row = row;
  return { sb: { from: () => makeQuery() }, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; state.deletes = []; });

describe("sessions/booking actions (party gate)", () => {
  it("bookingCancel requires bookingId (400)", async () => {
    const r = await bookingCancel(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("bookingCancel returns 404 when booking missing", async () => {
    const r = await bookingCancel(ctx({ bookingId: "b1" }, null));
    expect((r as Response).status).toBe(404);
  });

  it("bookingCancel rejects a non-party (403)", async () => {
    const r = await bookingCancel(ctx({ bookingId: "b1" }, { id: "b1", user_id: "someone", host_id: "else" }));
    expect((r as Response).status).toBe(403);
  });

  it("bookingCancel allows the booker (200)", async () => {
    const r = await bookingCancel(ctx({ bookingId: "b1" }, { id: "b1", user_id: "me1", host_id: "h1" }));
    expect((r as Response).status).toBe(200);
  });

  it("bookingRespond rejects a non-host (403)", async () => {
    const r = await bookingRespond(ctx({ bookingId: "b1", response: "accept" }, { id: "b1", user_id: "u1", host_id: "someone" }));
    expect((r as Response).status).toBe(403);
  });

  it("sessionBook requires fields (400)", async () => {
    const r = await sessionBook(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });
});
