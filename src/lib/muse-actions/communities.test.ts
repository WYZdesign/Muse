import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSb, tableCalls, eqOf, selectArg, type SbCall } from "@/test-support/sb";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));

const state: any = { row: null, upserts: [], inserts: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import {
  communityJoin, communityLeave, communityCreate, eventRsvp, eventCreate,
  communityUpdateRules, communityKick, communityBan, communityUnban, communitySetRole,
  communityGetBans, eventCancelRsvp, communityMute, communityUnmute, communityGetMutes,
  communityGetJoinRequests, communityApproveJoinRequest, communityDenyJoinRequest,
} from "@/lib/muse-actions/communities";

const UUID = "11111111-1111-4111-8111-111111111111";
function install(handlers: Record<string, (calls: SbCall[]) => any>) {
  const sb: any = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  (globalThis as any).__sbMock = sb;
  return sb;
}
function act(rest: any) {
  return { sb: (globalThis as any).__sbMock, profile: { id: "me1", name: "Ada", avatar: "av" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}
function memberHandler(requester: string, target: any = null) {
  return (calls: SbCall[]) => {
    if (selectArg(calls) === "*") return { count: 3 };
    if (calls.some((c) => ["update", "delete"].includes(c.method))) return { data: null, error: null };
    return eqOf(calls, "user_id") === "me1" ? { data: requester ? { role: requester } : null } : { data: target };
  };
}

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

describe("communityJoin — private/public and join-request lifecycle", () => {
  it("403s when the viewer is banned", async () => {
    install({ muse_communities: () => ({ data: { id: UUID, is_private: false } }), muse_community_bans: () => ({ data: { id: "b1" } }) });
    expect((await communityJoin(act({ communityId: UUID })) as Response).status).toBe(403);
  });

  it("returns pending for an existing pending request", async () => {
    install({
      muse_communities: () => ({ data: { id: UUID, is_private: true } }),
      muse_community_bans: () => ({ data: null }),
      muse_community_join_requests: () => ({ data: { id: "jr", status: "pending" } }),
    });
    expect(await (await communityJoin(act({ communityId: UUID })) as Response).json()).toEqual({ success: true, pending: true });
  });

  it("joins directly when a prior request was approved and refreshes member_count", async () => {
    const sb = install({
      muse_communities: () => ({ data: { id: UUID, is_private: true } }),
      muse_community_bans: () => ({ data: null }),
      muse_community_join_requests: () => ({ data: { id: "jr", status: "approved" } }),
      muse_community_members: () => ({ count: 5 }),
    });
    const r = await communityJoin(act({ communityId: UUID }));
    expect((r as Response).status).toBe(200);
    const joinUpdate = tableCalls(sb.__log, "muse_communities").find((c) => c.method === "update");
    expect(joinUpdate?.args[0]).toEqual({ member_count: 5 });
  });

  it("403s when a prior request was denied", async () => {
    install({
      muse_communities: () => ({ data: { id: UUID, is_private: true } }),
      muse_community_bans: () => ({ data: null }),
      muse_community_join_requests: () => ({ data: { id: "jr", status: "denied" } }),
    });
    expect((await communityJoin(act({ communityId: UUID })) as Response).status).toBe(403);
  });

  it("creates a pending join request when none exists", async () => {
    const sb = install({
      muse_communities: () => ({ data: { id: UUID, is_private: true } }),
      muse_community_bans: () => ({ data: null }),
      muse_community_join_requests: () => ({ data: null }),
    });
    const r = await communityJoin(act({ communityId: UUID }));
    expect(await (r as Response).json()).toEqual({ success: true, pending: true });
    const ins = tableCalls(sb.__log, "muse_community_join_requests").find((c) => c.method === "insert");
    expect(ins?.args[0]).toMatchObject({ community_id: UUID, user_id: "me1" });
  });

  it("joins a public community and updates the member count", async () => {
    const sb = install({ muse_communities: () => ({ data: { id: UUID, is_private: false } }), muse_community_bans: () => ({ data: null }), muse_community_members: () => ({ count: 9 }) });
    const r = await communityJoin(act({ communityId: UUID }));
    expect((r as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_community_members").some((c) => c.method === "upsert")).toBe(true);
  });
});

describe("communityLeave / eventRsvp / eventCancelRsvp", () => {
  it("communityLeave demo-stubs non-uuid ids", async () => {
    install({});
    expect(await (await communityLeave(act({ communityId: "stub" })) as Response).json()).toMatchObject({ demo: true });
  });
  it("communityLeave 400s for a missing community", async () => {
    install({ muse_communities: () => ({ data: null }) });
    expect((await communityLeave(act({ communityId: UUID })) as Response).status).toBe(400);
  });
  it("communityLeave deletes the membership", async () => {
    const sb = install({ muse_communities: () => ({ data: { id: UUID } }) });
    expect((await communityLeave(act({ communityId: UUID })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_community_members").some((c) => c.method === "delete")).toBe(true);
  });
  it("eventRsvp is idempotent for an existing rsvp", async () => {
    install({ muse_rsvps: () => ({ data: { id: "r1" } }) });
    expect(await (await eventRsvp(act({ eventId: UUID })) as Response).json()).toEqual({ success: true, alreadyRsvpd: true });
  });
  it("eventRsvp surfaces an insert error as 500", async () => {
    install({ muse_rsvps: (calls) => (calls.some((c) => c.method === "insert") ? { data: null, error: { message: "dup" } } : { data: null }) });
    expect((await eventRsvp(act({ eventId: UUID })) as Response).status).toBe(500);
  });
  it("eventRsvp inserts for a fresh user", async () => {
    const sb = install({ muse_rsvps: () => ({ data: null }) });
    expect((await eventRsvp(act({ eventId: UUID })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_rsvps").some((c) => c.method === "insert")).toBe(true);
  });
  it("eventCancelRsvp demo-stubs and otherwise deletes", async () => {
    install({});
    expect(await (await eventCancelRsvp(act({ eventId: "stub" })) as Response).json()).toMatchObject({ demo: true });
    const sb = install({});
    expect((await eventCancelRsvp(act({ eventId: UUID })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_rsvps").some((c) => c.method === "delete")).toBe(true);
  });
});

describe("eventCreate", () => {
  it("requires a title", async () => {
    install({});
    expect((await eventCreate(act({ description: "x" })) as Response).status).toBe(400);
  });
  it("inserts an event with defaults", async () => {
    const sb = install({ muse_events: () => ({ data: { id: "e1" } }) });
    expect((await eventCreate(act({ title: "Launch", date: "2026-07-01" })) as Response).status).toBe(200);
    const ins = tableCalls(sb.__log, "muse_events").find((c) => c.method === "insert");
    expect(ins?.args[0]).toMatchObject({ title: "Launch", category: "General", attendees: 0 });
  });
});

describe("communityUpdateRules", () => {
  it("400s without communityId or a rules array", async () => {
    install({});
    expect((await communityUpdateRules(act({})) as Response).status).toBe(400);
    expect((await communityUpdateRules(act({ communityId: UUID, rules: "no" })) as Response).status).toBe(400);
  });
  it("403s for a non-admin", async () => {
    install({ muse_community_members: memberHandler("member") });
    expect((await communityUpdateRules(act({ communityId: UUID, rules: [] })) as Response).status).toBe(403);
  });
  it("cleans and drops titleless rules for an admin", async () => {
    const sb = install({ muse_community_members: memberHandler("admin"), muse_communities: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: null }) });
    const r = await communityUpdateRules(act({ communityId: UUID, rules: [{ title: "Be kind", body: "b" }, { title: "", body: "drop me" }] }));
    expect((r as Response).status).toBe(200);
    const upd = tableCalls(sb.__log, "muse_communities").find((c) => c.method === "update");
    expect(upd?.args[0].rules).toEqual([{ title: "Be kind", body: "b" }]);
  });
});

describe("community moderation gates", () => {
  it("communityKick 403s a plain member", async () => {
    install({ muse_community_members: memberHandler("member") });
    expect((await communityKick(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(403);
  });
  it("communityKick forbids kicking an admin", async () => {
    install({ muse_community_members: memberHandler("admin", { role: "admin" }) });
    expect((await communityKick(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(403);
  });
  it("communityKick removes a normal member and recounts", async () => {
    const sb = install({ muse_community_members: memberHandler("admin", { role: "member" }), muse_communities: () => ({ data: null }) });
    expect((await communityKick(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_community_members").some((c) => c.method === "delete")).toBe(true);
  });
  it("communityBan forbids banning an admin and otherwise bans + removes", async () => {
    install({ muse_community_members: memberHandler("moderator", { role: "admin" }) });
    expect((await communityBan(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(403);
    const sb = install({ muse_community_members: memberHandler("moderator", { role: "member" }), muse_communities: () => ({ data: null }) });
    expect((await communityBan(act({ communityId: UUID, targetUserId: "t1", reason: "spam" })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_community_bans").some((c) => c.method === "upsert")).toBe(true);
  });
  it("communityUnban is admin-only", async () => {
    install({ muse_community_members: memberHandler("moderator") });
    expect((await communityUnban(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(403);
    const sb = install({ muse_community_members: memberHandler("admin") });
    expect((await communityUnban(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_community_bans").some((c) => c.method === "delete")).toBe(true);
  });
  it("communitySetRole validates the role and requires admin", async () => {
    install({ muse_community_members: memberHandler("admin") });
    expect((await communitySetRole(act({ communityId: UUID, targetUserId: "t1", role: "king" })) as Response).status).toBe(400);
    install({ muse_community_members: memberHandler("moderator") });
    expect((await communitySetRole(act({ communityId: UUID, targetUserId: "t1", role: "member" })) as Response).status).toBe(403);
  });
  it("communitySetRole updates for an admin", async () => {
    const sb = install({ muse_community_members: memberHandler("admin") });
    expect((await communitySetRole(act({ communityId: UUID, targetUserId: "t1", role: "moderator" })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_community_members").some((c) => c.method === "update")).toBe(true);
  });
  it("communityGetBans hides from non-mods and returns for mods", async () => {
    install({ muse_community_members: memberHandler("member") });
    expect(await (await communityGetBans(act({ communityId: UUID })) as Response).json()).toEqual({ bans: [] });
    install({ muse_community_members: memberHandler("moderator"), muse_community_bans: () => ({ data: [{ user_id: "t1" }] }) });
    expect((await (await communityGetBans(act({ communityId: UUID })) as Response).json()).bans).toHaveLength(1);
  });
});

describe("community mutes / join requests", () => {
  it("communityMute is mod-only and records an expiry", async () => {
    install({ muse_community_members: memberHandler("member") });
    expect((await communityMute(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(403);
    const sb = install({ muse_community_members: memberHandler("admin"), muse_community_mutes: () => ({ data: null }) });
    expect((await communityMute(act({ communityId: UUID, targetUserId: "t1", duration: 60 })) as Response).status).toBe(200);
    const up = tableCalls(sb.__log, "muse_community_mutes").find((c) => c.method === "upsert");
    expect(up?.args[0].expires_at).toBeTruthy();
  });
  it("communityUnmute is admin-only", async () => {
    install({ muse_community_members: memberHandler("moderator") });
    expect((await communityUnmute(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(403);
    install({ muse_community_members: memberHandler("admin") });
    expect((await communityUnmute(act({ communityId: UUID, targetUserId: "t1" })) as Response).status).toBe(200);
  });
  it("communityGetMutes hides from non-mods", async () => {
    install({ muse_community_members: memberHandler("member") });
    expect(await (await communityGetMutes(act({ communityId: UUID })) as Response).json()).toEqual({ mutes: [] });
    install({ muse_community_members: memberHandler("moderator"), muse_community_mutes: () => ({ data: [{ user_id: "t1" }] }) });
    expect((await (await communityGetMutes(act({ communityId: UUID })) as Response).json()).mutes).toHaveLength(1);
  });
  it("communityGetJoinRequests hides from non-mods", async () => {
    install({ muse_community_members: memberHandler("member") });
    expect(await (await communityGetJoinRequests(act({ communityId: UUID })) as Response).json()).toEqual({ requests: [] });
  });
  it("communityApproveJoinRequest 404s / 400s and otherwise approves + syncs count", async () => {
    install({ muse_community_members: memberHandler("admin"), muse_community_join_requests: () => ({ data: null }) });
    expect((await communityApproveJoinRequest(act({ communityId: UUID, requestId: "r1" })) as Response).status).toBe(404);
    install({ muse_community_members: memberHandler("admin"), muse_community_join_requests: () => ({ data: { id: "r1", status: "approved", user_id: "u2" } }) });
    expect((await communityApproveJoinRequest(act({ communityId: UUID, requestId: "r1" })) as Response).status).toBe(400);
    const sb = install({ muse_community_members: memberHandler("admin"), muse_community_join_requests: () => ({ data: { id: "r1", status: "pending", user_id: "u2", user_name: "Bo", user_avatar: "" } }), muse_communities: () => ({ data: null }) });
    expect((await communityApproveJoinRequest(act({ communityId: UUID, requestId: "r1" })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_community_members").some((c) => c.method === "upsert")).toBe(true);
  });
  it("communityDenyJoinRequest requires mod rights", async () => {
    install({ muse_community_members: memberHandler("member") });
    expect((await communityDenyJoinRequest(act({ communityId: UUID, requestId: "r1" })) as Response).status).toBe(403);
    install({ muse_community_members: memberHandler("admin") });
    expect((await communityDenyJoinRequest(act({ communityId: UUID, requestId: "r1" })) as Response).status).toBe(200);
  });
});
