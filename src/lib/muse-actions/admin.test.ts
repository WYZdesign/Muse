import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/http", () => ({ safeServerError: (e: any) => ({ error: e?.message || "err" }) }));

const state: any = { row: null, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { adminContentScans, adminSuspendUser, adminReports, adminStrikes, adminResolveReport } from "@/lib/muse-actions/admin";

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
