import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSb, tableCalls, selectArg, insertValue, updateValue, type SbCall } from "@/test-support/sb";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/http", () => ({
  safeServerError: () => new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { "content-type": "application/json" } }),
}));
vi.mock("@/lib/contentScan", () => ({
  scanWithRekognition: async (...a: any[]) => ((globalThis as any).__scan ? (globalThis as any).__scan(...a) : { scanned: false, flaggedCategories: [] }),
  logScan: async () => ({}),
}));

const state: any = { row: null, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import {
  adminContentScans, adminSuspendUser, adminReports, adminStrikes, adminResolveReport,
  adminResolveAppeal, adminBrain, adminCustomValues, adminReviewCustomValue, adminScanNsfw,
  adminResolveIncident, adminRefunds, adminResolveRefund,
} from "@/lib/muse-actions/admin";

function install(handlers: Record<string, (calls: SbCall[]) => any>) {
  const sb: any = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  (globalThis as any).__sbMock = sb;
  return sb;
}
function act(rest: any, email = "admin@wyzdesign.com") {
  return { sb: (globalThis as any).__sbMock, profile: { id: "me1", name: "Tor", email }, rest, ip: "10.0.0.1", req: {} as any } as any;
}
const UUID = "11111111-1111-4111-8111-111111111111";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, limit: () => q, order: () => q, or: () => q, gt: () => q,
    insert: (v: any) => { state.inserts.push(v); return q; },
    update: (v: any) => { state.updates.push(v); return q; },
    delete: () => q, maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: any, email: string, row: any) {
  state.row = row;
  return { sb: { from: () => makeQuery() }, profile: { id: "me1", email }, rest, ip: "10.0.0.1", req: {} as any } as any;
}
function ctxAdmin(rest: any, row: any) { process.env.ADMIN_EMAILS = "admin@wyzdesign.com"; return ctx(rest, "admin@wyzdesign.com", row); }

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; state.deletes = []; process.env.ADMIN_EMAILS = "admin@wyzdesign.com"; });

describe("admin actions (isAdminEmail gate)", () => {
  it("adminContentScans returns 403 for a non-admin", async () => {
    const r = await adminContentScans(ctx({}, "user@example.com", null));
    expect((r as Response).status).toBe(403);
  });

  it("adminReports returns 403 for a non-admin", async () => {
    const r = await adminReports(ctx({}, "user@example.com", null));
    expect((r as Response).status).toBe(403);
  });

  it("adminStrikes returns 403 for a non-admin", async () => {
    const r = await adminStrikes(ctx({}, "user@example.com", null));
    expect((r as Response).status).toBe(403);
  });

  it("adminSuspendUser requires userId (400) even for admin", async () => {
    const r = await adminSuspendUser(ctxAdmin({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("adminSuspendUser returns 403 for a non-admin", async () => {
    const r = await adminSuspendUser(ctx({}, "user@example.com", null));
    expect((r as Response).status).toBe(403);
  });
});

describe("adminResolveReport — closing out a report (moderation queue)", () => {
  const REPORT_ID = "11111111-1111-1111-1111-111111111111";

  it("returns 403 for a non-admin", async () => {
    const r = await adminResolveReport(ctx({ reportId: REPORT_ID, resolution: "dismissed" }, "user@example.com", null));
    expect((r as Response).status).toBe(403);
  });

  it("requires a valid UUID reportId", async () => {
    const r = await adminResolveReport(ctxAdmin({ reportId: "not-a-uuid", resolution: "dismissed" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("rejects an invalid resolution value", async () => {
    const r = await adminResolveReport(ctxAdmin({ reportId: REPORT_ID, resolution: "ignored" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("dismisses a report: writes status=dismissed + resolved_at/by, and an audit log entry", async () => {
    const r = await adminResolveReport(ctxAdmin({ reportId: REPORT_ID, resolution: "dismissed", note: "False alarm" }, null));
    expect((r as any).status ?? 200).not.toBe(403);
    const reportUpdate = state.updates.find((u: any) => u.status === "dismissed");
    expect(reportUpdate).toBeTruthy();
    expect(reportUpdate.resolved_by).toBe("me1");
    expect(reportUpdate.resolution_note).toBe("False alarm");
    expect(state.inserts.some((i: any) => String(i.query_text || "").startsWith(`resolve_report:${REPORT_ID}:dismissed`))).toBe(true);
  });

  it("actions a report: writes status=actioned", async () => {
    await adminResolveReport(ctxAdmin({ reportId: REPORT_ID, resolution: "actioned" }, null));
    expect(state.updates.some((u: any) => u.status === "actioned")).toBe(true);
  });
});

describe("adminSuspendUser off a report row closes the report too", () => {
  const REPORT_ID = "22222222-2222-2222-2222-222222222222";

  it("updates the report to status=actioned when reportId is supplied", async () => {
    await adminSuspendUser(ctxAdmin({ targetUserId: "target1", reason: "spam", durationDays: 7, reportId: REPORT_ID }, null));
    const reportUpdate = state.updates.find((u: any) => u.status === "actioned");
    expect(reportUpdate).toBeTruthy();
    expect(reportUpdate.resolved_by).toBe("me1");
  });

  it("does not touch muse_reports when no reportId is supplied", async () => {
    await adminSuspendUser(ctxAdmin({ targetUserId: "target2", reason: "spam", durationDays: 7 }, null));
    expect(state.updates.some((u: any) => u.status === "actioned")).toBe(false);
  });
});

beforeEach(() => { (globalThis as any).__scan = undefined; vi.restoreAllMocks(); });

describe("adminResolveAppeal", () => {
  it("403s for a non-admin", async () => {
    install({});
    expect((await adminResolveAppeal(act({ strikeId: "s1", resolution: "upheld" }, "user@x.com")) as Response).status).toBe(403);
  });
  it("400s for an invalid resolution", async () => {
    install({});
    expect((await adminResolveAppeal(act({ strikeId: "s1", resolution: "maybe" })) as Response).status).toBe(400);
  });
  it("overturning downgrades severity to warning and audits", async () => {
    const sb = install({ muse_strikes: () => ({ data: null }), muse_admin_audit_log: () => ({ data: null }) });
    const r = await adminResolveAppeal(act({ strikeId: "s1", resolution: "overturned" }));
    expect((r as Response).status).toBe(200);
    expect(updateValue(tableCalls(sb.__log, "muse_strikes"))).toMatchObject({ appeal_status: "overturned", severity: "warning" });
    expect(tableCalls(sb.__log, "muse_admin_audit_log").some((c) => c.method === "insert")).toBe(true);
  });
});

describe("adminBrain", () => {
  function handlers(over: Record<string, any> = {}) {
    return {
      muse_profiles: (calls: SbCall[]) => {
        if (calls.some((c) => c.method === "ilike")) return { data: over.users ?? [] };
        if (selectArg(calls).includes("created_at")) return { data: over.signups ?? [] };
        return { data: null, count: over.userCount ?? 0 };
      },
      muse_matches: () => ({ count: over.matchCount ?? 0 }),
      muse_reports: (calls: SbCall[]) => (calls.some((c) => c.method === "order") ? { data: over.reports ?? [] } : { count: over.reportCount ?? 0 }),
      muse_strikes: (calls: SbCall[]) => (calls.some((c) => c.method === "order") ? { data: over.strikes ?? [] } : { count: over.strikeCount ?? 0 }),
      muse_disclosures: () => ({ data: over.disclosures ?? [] }),
      muse_activity_log: () => ({ data: over.activity ?? [] }),
      muse_safety_checkins: () => ({ data: over.checkins ?? [] }),
      muse_prompt_responses: () => ({ count: over.promptResponses ?? 0 }),
      muse_prompt_bank: () => ({ count: over.prompts ?? 0 }),
      muse_admin_audit_log: () => ({ data: null }),
      ...over.extra,
    };
  }
  it("403s for a non-admin and 400s without a query", async () => {
    install({});
    expect((await adminBrain(act({ query: "users" }, "user@x.com")) as Response).status).toBe(403);
    install({});
    expect((await adminBrain(act({})) as Response).status).toBe(400);
  });
  it("answers a user-count question", async () => {
    install(handlers({ userCount: 42 }));
    const body = await (await adminBrain(act({ query: "how many users" })) as Response).json();
    expect(body.answer).toContain("42");
  });
  it("answers a match-total question", async () => {
    install(handlers({ matchCount: 7 }));
    expect((await (await adminBrain(act({ query: "total matches" })) as Response).json()).answer).toContain("7");
  });
  it("summarizes reports", async () => {
    install(handlers({ reports: [{ id: "r1" }], reportCount: 3 }));
    expect((await (await adminBrain(act({ query: "show reports" })) as Response).json()).data.count).toBe(3);
  });
  it("summarizes strikes with active suspensions", async () => {
    install(handlers({ strikes: [{ severity: "suspension", suspension_ends_at: new Date(Date.now() + 1e9).toISOString() }, { severity: "warning" }], strikeCount: 2 }));
    const body = await (await adminBrain(act({ query: "strikes" })) as Response).json();
    expect(body.data.suspendedCount).toBe(1);
  });
  it("summarizes disclosures", async () => {
    install(handlers({ disclosures: [{ status: "blocked" }, { status: "pending" }] }));
    expect((await (await adminBrain(act({ query: "disclosures" })) as Response).json()).data.blockedCount).toBe(1);
  });
  it("summarizes engagement", async () => {
    install(handlers({ activity: [{ user_id: "u1" }, { user_id: "u1" }, { user_id: "u2" }], signups: [{ id: "x" }] }));
    const body = await (await adminBrain(act({ query: "engagement" })) as Response).json();
    expect(body.data.active7d).toBe(2);
  });
  it("summarizes safety check-ins", async () => {
    install(handlers({ checkins: [{ status: "pending" }, { status: "cancelled" }, { status: "ok" }] }));
    const body = await (await adminBrain(act({ query: "safety checkins" })) as Response).json();
    expect(body.data).toMatchObject({ pendingCount: 1, cancelledCount: 1 });
  });
  it("user-detail reports not-found clearly", async () => {
    install(handlers({ users: [] }));
    const body = await (await adminBrain(act({ query: "user detail nobody" })) as Response).json();
    expect(body.answer).toContain("No user found");
  });
  it("returns a full user dossier when found", async () => {
    install(handlers({ users: [{ id: "u1", name: "Jo", email: "jo@x.com", created_at: new Date().toISOString(), looking: [], stats: {} }] }));
    const body = await (await adminBrain(act({ query: "user profile jo" })) as Response).json();
    expect(body.data.profile.name).toBe("Jo");
  });
  it("user-find counts matches", async () => {
    install(handlers({ users: [{ id: "u1", name: "Jane" }] }));
    expect((await (await adminBrain(act({ query: "find user jane" })) as Response).json()).answer).toContain("1 users");
  });
  it("prompt-response counts", async () => {
    install(handlers({ promptResponses: 30, prompts: 10, extra: { muse_prompt_bank: () => ({ count: 10 }) } }));
    expect((await (await adminBrain(act({ query: "prompt responses" })) as Response).json()).answer).toContain("30");
  });
  it("falls back to an overview for a generic query", async () => {
    install(handlers({ userCount: 5, matchCount: 4, reportCount: 3, strikeCount: 2 }));
    const body = await (await adminBrain(act({ query: "overview" })) as Response).json();
    expect(body.data).toMatchObject({ users: 5, matches: 4, reports: 3, strikes: 2 });
  });
  it("500s when a query throws", async () => {
    install({ muse_profiles: () => { throw new Error("db down"); } });
    expect((await adminBrain(act({ query: "how many users" })) as Response).status).toBe(500);
  });
});

describe("admin read-only lists", () => {
  it("adminReports / adminStrikes / adminContentScans / adminCustomValues / adminRefunds return data for admins", async () => {
    install({
      muse_reports: () => ({ data: [{ id: "r1" }] }),
      muse_strikes: () => ({ data: [{ id: "s1" }] }),
      muse_content_scans: () => ({ data: [{ id: "c1" }] }),
      muse_safety_incidents: () => ({ data: [{ id: "i1" }] }),
      muse_profiles: () => ({ data: [{ id: "p1" }] }),
      muse_refund_requests: () => ({ data: [{ id: "rf1" }] }),
    });
    expect((await (await adminReports(act({})) as Response).json()).reports).toHaveLength(1);
    expect((await (await adminStrikes(act({})) as Response).json()).strikes).toHaveLength(1);
    expect((await (await adminContentScans(act({})) as Response).json()).scans).toHaveLength(1);
    expect((await (await adminCustomValues(act({})) as Response).json()).profiles).toHaveLength(1);
    expect((await (await adminRefunds(act({})) as Response).json()).refunds).toHaveLength(1);
  });
});

describe("adminReviewCustomValue / adminResolveIncident / adminResolveRefund", () => {
  it("adminReviewCustomValue validates and clears the flag", async () => {
    install({});
    expect((await adminReviewCustomValue(act({ targetUserId: "bad", field: "type" })) as Response).status).toBe(400);
    expect((await adminReviewCustomValue(act({ targetUserId: UUID, field: "nope" })) as Response).status).toBe(400);
    const sb = install({ muse_profiles: () => ({ data: null }), muse_admin_audit_log: () => ({ data: null }) });
    expect((await adminReviewCustomValue(act({ targetUserId: UUID, field: "style" })) as Response).status).toBe(200);
    expect(updateValue(tableCalls(sb.__log, "muse_profiles"))).toEqual({ custom_style_pending: false });
  });
  it("adminResolveIncident validates the id and updates status", async () => {
    install({});
    expect((await adminResolveIncident(act({ incidentId: "bad" })) as Response).status).toBe(400);
    const sb = install({ muse_safety_incidents: () => ({ data: null }), muse_admin_audit_log: () => ({ data: null }) });
    expect((await adminResolveIncident(act({ incidentId: UUID })) as Response).status).toBe(200);
    expect(updateValue(tableCalls(sb.__log, "muse_safety_incidents"))).toEqual({ status: "reviewed" });
  });
  it("adminResolveRefund maps refund/decline to statuses", async () => {
    install({});
    expect((await adminResolveRefund(act({ requestId: "bad", resolve: "refund" })) as Response).status).toBe(400);
    expect((await adminResolveRefund(act({ requestId: UUID, resolve: "nope" })) as Response).status).toBe(400);
    const sb = install({ muse_refund_requests: () => ({ data: null }), muse_admin_audit_log: () => ({ data: null }) });
    await adminResolveRefund(act({ requestId: UUID, resolve: "refund", note: "ok" }));
    expect(updateValue(tableCalls(sb.__log, "muse_refund_requests"))).toMatchObject({ status: "resolved_refund", resolution_note: "ok" });
    await adminResolveRefund(act({ requestId: UUID, resolve: "decline" }));
    expect(updateValue(tableCalls(sb.__log, "muse_refund_requests")).status).toBe("resolved_declined");
  });
});

describe("adminSuspendUser — success paths", () => {
  it("suspends temporarily with a notification and audit entry", async () => {
    const sb = install({ muse_strikes: () => ({ data: null }), muse_profiles: () => ({ data: null }), muse_notifications: () => ({ data: null }), muse_admin_audit_log: () => ({ data: null }) });
    const body = await (await adminSuspendUser(act({ targetUserId: "t1", reason: "spam", durationDays: 7 })) as Response).json();
    expect(body).toEqual({ success: true });
    expect(insertValue(tableCalls(sb.__log, "muse_strikes"))).toMatchObject({ user_id: "t1", severity: "suspension", issued_by: "me1" });
    expect(insertValue(tableCalls(sb.__log, "muse_notifications")).body).toContain("suspended until");
  });
  it("permanently bans with no duration", async () => {
    const sb = install({ muse_strikes: () => ({ data: null }), muse_profiles: () => ({ data: null }), muse_notifications: () => ({ data: null }), muse_admin_audit_log: () => ({ data: null }) });
    await adminSuspendUser(act({ targetUserId: "t1", reason: "csam" }));
    expect(insertValue(tableCalls(sb.__log, "muse_strikes")).severity).toBe("permanent_ban");
  });
  it("refuses to suspend yourself", async () => {
    install({});
    expect((await adminSuspendUser(act({ targetUserId: "me1" })) as Response).status).toBe(400);
  });
  it("500s when the strike insert fails", async () => {
    install({ muse_strikes: () => ({ data: null, error: { message: "db" } }) });
    expect((await adminSuspendUser(act({ targetUserId: "t1" })) as Response).status).toBe(500);
  });
});

describe("adminScanNsfw", () => {
  it("400s without userId or all", async () => {
    install({});
    expect((await adminScanNsfw(act({})) as Response).status).toBe(400);
  });
  it("scans allowlisted avatars, flags suggestive results and counts errors", async () => {
    (globalThis as any).__scan = async () => ({ scanned: true, flaggedCategories: ["Suggestive"] });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as any);
    const sb = install({
      muse_profiles: (calls) => (calls.some((c) => ["update", "insert"].includes(c.method)) ? { data: null } : { data: [
        { id: "p1", avatar: "https://x.supabase.co/a.jpg", name: "A" },
        { id: "p2", avatar: "/local.jpg", name: "B" },
        { id: "p3", avatar: "https://evil.example/a.jpg", name: "C" },
      ] }),
      muse_admin_audit_log: () => ({ data: null }),
    });
    const body = await (await adminScanNsfw(act({ all: true })) as Response).json();
    expect(body.scanned).toBe(1);
    expect(body.flagged).toBe(1);
    expect(body.errors).toBe(1);
    expect(tableCalls(sb.__log, "muse_profiles").some((c) => c.method === "update")).toBe(true);
  });
  it("scans a single user by id", async () => {
    (globalThis as any).__scan = async () => ({ scanned: true, flaggedCategories: [] });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) } as any);
    install({ muse_profiles: () => ({ data: { id: "p1", avatar: "https://x.supabase.co/a.jpg", name: "A" } }), muse_admin_audit_log: () => ({ data: null }) });
    const body = await (await adminScanNsfw(act({ userId: "p1" })) as Response).json();
    expect(body.scanned).toBe(1);
    expect(body.flagged).toBe(0);
  });
});
