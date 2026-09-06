import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => ({}), notify: (...a: any[]) => ({ subject: a[1] || "", text: a[2] || "" }) }));
vi.mock("@/lib/push", () => ({ pushToProfile: async () => ({}) }));
vi.mock("@/lib/questEngine", () => ({ bumpQuest: async () => ({}), setQuestProgress: async () => ({}), questPeriodKey: () => "daily", awardQuestXp: async () => ({}), refreshMetaQuest: async () => ({}), getQuestDefinitions: () => [], questsForPeriod: () => [], rotateQuests: () => [], seededHash: () => 0, bumpLoginStreak: async () => ({}), setReferralQuestProgress: async () => ({}) }));
vi.mock("@/lib/contentScan", () => ({ scanWithRekognition: async () => ({ safe: true }), logScan: async () => ({}) }));

const state: any = { row: null, inserts: [], updates: [], deletes: [] };
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import { feedPost, momentCreate, briefApply, feedCommentAdd } from "@/lib/muse-actions/feed";

function makeQuery() {
  const q: any = {
    select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q, or: () => q, update: () => q, delete: () => q, upsert: () => q,
    insert: (v: any) => { state.inserts.push(v); return q; },
    maybeSingle: async () => ({ data: state.row ?? null }),
    single: async () => ({ data: state.row ?? null }),
  };
  return q;
}
function ctx(rest: any, row: any) {
  state.row = row;
  return { sb: { from: () => makeQuery() }, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

beforeEach(() => { vi.clearAllMocks(); state.row = null; state.inserts = []; state.updates = []; state.deletes = []; });

describe("feed actions", () => {
  it("feedPost requires text (400)", async () => {
    const r = await feedPost(ctx({ image_url: "x" }, null));
    expect((r as Response).status).toBe(400);
  });

  it("feedPost accepts text (200)", async () => {
    const r = await feedPost(ctx({ text: "hello" }, null));
    expect((r as Response).status).toBe(200);
  });

  it("momentCreate requires text or img (400)", async () => {
    const r = await momentCreate(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("briefApply requires briefId (400)", async () => {
    const r = await briefApply(ctx({}, null));
    expect((r as Response).status).toBe(400);
  });

  it("feedCommentAdd requires postId (400)", async () => {
    const r = await feedCommentAdd(ctx({ text: "hi" }, null));
    expect((r as Response).status).toBe(400);
  });
});
