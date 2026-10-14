import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
import type { ActionContext } from "@/lib/muse-actions/shared";

vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: unknown[]) => ({ subject: String(a[1] ?? ""), text: String(a[2] ?? "") }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));

const state: { row: unknown; inserts: unknown[]; updates: unknown[] } = { row: null, inserts: [], updates: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as typeof globalThis & { __sbMock: unknown }).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { connectRequest } from "@/lib/muse-actions/connect";

type Query = {
  select: (...a: unknown[]) => Query;
  eq: (...a: unknown[]) => Query;
  in: (...a: unknown[]) => Query;
  order: (...a: unknown[]) => Query;
  limit: (...a: unknown[]) => Query;
  insert: (v: unknown) => Query;
  update: (v: unknown) => Query;
  maybeSingle: () => Promise<{ data: unknown }>;
  single: () => Promise<{ data: unknown }>;
};

function makeQuery(): Query {
  const q: Query = {
    select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
    insert: (v) => { state.inserts.push(v); return q; },
    update: (v) => { state.updates.push(v); return q; },
    maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: Record<string, unknown>, row: unknown): ActionContext {
  state.row = row;
  return {
    sb: { from: () => makeQuery() } as unknown as ActionContext["sb"],
    profile: { id: "me1", name: "Ada" },
    rest,
    ip: "10.0.0.1",
    req: {} as ActionContext["req"],
  };
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; });

describe("connectRequest", () => {
  it("requires a code (400)", async () => {
    const r = await connectRequest(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("rejects a non-valid code (400/404)", async () => {
    const r = await connectRequest(ctx({ code: "BADCODE" }, null));
    expect([400, 404]).toContain((r as Response).status);
  });
});
