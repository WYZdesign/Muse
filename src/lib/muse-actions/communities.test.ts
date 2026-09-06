import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));

const state: any = { row: null, upserts: [], inserts: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { communityJoin, communityLeave, communityCreate, eventRsvp } from "@/lib/muse-actions/communities";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, limit: () => q, order: () => q, range: () => q,
    upsert: (v: any) => { state.upserts.push(v); return q; },
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: () => q, delete: () => q, or: () => q,
    maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: any, row: any) {
  state.row = row;
  return { sb: { from: () => makeQuery() }, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.upserts = []; state.inserts = []; state.deletes = []; });

describe("communities actions", () => {
  it("communityJoin requires communityId (400)", async () => {
    const r = await communityJoin(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("communityJoin demo-stub short-circuits (200 demo)", async () => {
    const r = await communityJoin(ctx({ communityId: "stub-id" }, null));
    expect((r as Response).status).toBe(200);
    const body = await (r as Response).json();
    expect(body.demo).toBe(true);
  });

  it("communityJoin returns 400 for a non-existent community", async () => {
    const r = await communityJoin(ctx({ communityId: "11111111-1111-4111-8111-111111111111" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("communityLeave requires communityId (400)", async () => {
    const r = await communityLeave(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("eventRsvp requires eventId (400)", async () => {
    const r = await eventRsvp(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("communityCreate seeds the creator's membership with the admin role", async () => {
    const r = await communityCreate(ctx({ name: "New Group" }, { id: "c1", name: "New Group" }));
    expect((r as Response).status).toBe(200);
    expect(state.upserts[0]).toMatchObject({ community_id: "c1", user_id: "me1", role: "admin" });
  });
});
