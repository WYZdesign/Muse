import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("@/lib/contentScan", () => ({ scanWithRekognition: async () => ({ safe: true }), logScan: async () => ({}) }));
vi.mock("@/lib/aiDocs", () => ({ askMuseAI: async () => ({ answer: "" }) }));

const state: any = { row: null, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { reportCreate, userBlock } from "@/lib/muse-actions/forum";

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

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; state.deletes = []; });

describe("forum/safety actions", () => {
  it("reportCreate requires target_id + reason (400)", async () => {
    const r = await reportCreate(ctx({ target_id: "t1" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("reportCreate rejects reporting yourself (400)", async () => {
    const r = await reportCreate(ctx({ target_id: "me1", reason: "spam" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("userBlock requires target_id (400)", async () => {
    const r = await userBlock(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("userBlock rejects blocking yourself (400)", async () => {
    const r = await userBlock(ctx({ target_id: "me1" }, null));
    expect((r as Response).status).toBe(400);
  });

  // Regression coverage for a real bug found during the wyzmind/Claude
  // reconciliation pass: report coverage was extended to BTS moments,
  // Community groups/events, and Session listings using target_type values
  // "moment" / "community" / "community_event" / "session", but the
  // isPostTarget whitelist only recognized "feed_post"/"forum_post". A real
  // (UUID-format) report of these new types incorrectly fell into the
  // muse_profiles existence check, found no matching profile, and failed
  // with "Target not found" even though the target itself was valid.
  const uuid = "11111111-1111-4111-8111-111111111111";
  it.each(["moment", "community", "community_event", "session"])(
    "reportCreate treats %s as a post-shaped target, not a profile lookup",
    async (target_type) => {
      // state.row stays null (no matching muse_profiles row) — if this type
      // were still misclassified as a profile target, the missing row would
      // produce a 400 "Target not found". Success here proves the fix.
      const r = await reportCreate(ctx({ target_id: uuid, target_type, reason: "spam" }, null));
      expect((r as Response).status ?? 200).not.toBe(400);
      expect(state.inserts.some((i: any) => i.target_type === target_type)).toBe(true);
    }
  );

  it("reportCreate still 400s a real feed_post-adjacent user-type report when the profile doesn't exist", async () => {
    const r = await reportCreate(ctx({ target_id: uuid, target_type: "user", reason: "spam" }, null));
    expect((r as Response).status).toBe(400);
  });
});
