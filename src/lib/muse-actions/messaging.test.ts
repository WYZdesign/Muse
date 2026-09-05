import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));

const state: any = { row: null, inserts: [], updates: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { messageSend } from "@/lib/muse-actions/messaging";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, limit: () => q, order: () => q, or: () => q,
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

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; });

describe("messageSend", () => {
  it("requires text or image (400)", async () => {
    const r = await messageSend(ctx({ toId: "u2" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("requires toId (400)", async () => {
    const r = await messageSend(ctx({ text: "hi" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("rejects an invalid toId", async () => {
    // non-UUID non-stub toId that doesn't resolve as a demo short-circuit
    const r = await messageSend(ctx({ toId: "not-a-real-id", text: "hi" }, null));
    // returns 400 (not found) or 403 (blocked) — either is a valid rejection,
    // just not a silent success
    expect((r as Response).status).not.toBe(200);
  });
});
