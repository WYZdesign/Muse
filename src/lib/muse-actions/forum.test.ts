import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import { reportCreate, userBlock, forumDispatch, forumPostPin, forumPostLock } from "@/lib/muse-actions/forum";

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

// Regression coverage for two bugs found in a deep audit of the forum
// actions: (1) forumPostPin/forumPostLock checked a hardcoded email
// allowlist instead of the shared isAdminEmail()/ADMIN_EMAILS mechanism
// every other admin-gated action uses — real admins couldn't pin/lock, and
// the hardcoded emails were disconnected from the actual admin roster; (2)
// forum "vote" had no per-user dedup at all, unlike feed-post-like and
// moment-like, so one user could call it repeatedly to inflate/deflate a
// post's score.
describe("forum admin gate + vote dedup", () => {
  const prevAdminEmails = process.env.ADMIN_EMAILS;
  beforeEach(() => { process.env.ADMIN_EMAILS = "admin@wyzdesign.com,torree.marcel@gmail.com"; });
  afterEach(() => { process.env.ADMIN_EMAILS = prevAdminEmails; });

  // Per-table row + call log so a single test can distinguish the
  // activity_log dedup lookup from the forum_posts votes lookup.
  function tableCtx(rest: any, rows: Record<string, any>, profile: any = { id: "me1", name: "Ada", email: "someone@example.com" }) {
    const inserts: any[] = [];
    const updates: any[] = [];
    const sb = {
      from: (table: string) => {
        const q: any = {
          select: () => q, eq: () => q, in: () => q, limit: () => q, order: () => q, or: () => q, gte: () => q,
          insert: (v: any) => { inserts.push({ table, ...v }); return q; },
          update: (v: any) => { updates.push({ table, ...v }); return q; },
          delete: () => q,
          maybeSingle: async () => ({ data: rows[table] ?? null }),
          single: async () => ({ data: rows[table] ?? null }),
        };
        return q;
      },
    };
    return { ctx: { sb, profile, rest, ip: "10.0.0.1", rawType: rest.type, req: {} as any } as any, inserts, updates };
  }

  it("forumPostPin: real admin (via ADMIN_EMAILS) can pin someone else's post", async () => {
    const { ctx } = tableCtx({ postId: "11111111-1111-4111-8111-111111111111" }, { muse_forum_posts: { author_id: "someone-else", pinned: false } }, { id: "admin1", email: "admin@wyzdesign.com" });
    const r = await forumPostPin(ctx);
    expect((r as Response).status ?? 200).not.toBe(403);
  });

  it("forumPostPin: non-admin, non-author is rejected", async () => {
    const { ctx } = tableCtx({ postId: "11111111-1111-4111-8111-111111111111" }, { muse_forum_posts: { author_id: "someone-else", pinned: false } }, { id: "randomUser", email: "random@example.com" });
    const r = await forumPostPin(ctx);
    expect((r as Response).status).toBe(403);
  });

  it("forumPostLock: the old hardcoded admin@muse.app email no longer grants admin (must go through ADMIN_EMAILS)", async () => {
    const { ctx } = tableCtx({ postId: "11111111-1111-4111-8111-111111111111" }, { muse_forum_posts: { author_id: "someone-else", locked: false } }, { id: "x", email: "admin@muse.app" });
    const r = await forumPostLock(ctx);
    expect((r as Response).status).toBe(403);
  });

  it("forumDispatch vote: first vote succeeds and is recorded for dedup", async () => {
    const { ctx, inserts } = tableCtx(
      { type: "vote", postId: "11111111-1111-4111-8111-111111111111", direction: "up" },
      { muse_activity_log: null, muse_forum_posts: { votes: 5 } },
    );
    const r = await forumDispatch(ctx);
    const body = await (r as Response).json();
    expect(body.success).toBe(true);
    expect(body.votes).toBe(6);
    expect(inserts.some(i => i.table === "muse_activity_log" && i.type === "forum_vote")).toBe(true);
  });

  it("forumDispatch vote: a second vote from the same user on the same post is rejected (409)", async () => {
    const { ctx } = tableCtx(
      { type: "vote", postId: "11111111-1111-4111-8111-111111111111", direction: "up" },
      { muse_activity_log: { id: "existing-vote-row" }, muse_forum_posts: { votes: 5 } },
    );
    const r = await forumDispatch(ctx);
    expect((r as Response).status).toBe(409);
  });
});
