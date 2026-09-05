import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/http", () => ({ safeServerError: (e: any) => ({ error: e?.message || "err" }) }));

const state: any = { row: null, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { adminContentScans, adminSuspendUser, adminReports, adminStrikes } from "@/lib/muse-actions/admin";

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
