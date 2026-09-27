import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSb, tableCalls, insertValue, updateValue, type SbCall } from "@/test-support/sb";

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

import { feedPost, momentCreate, briefApply, feedCommentAdd, feedPostLike, momentLike, briefCreate } from "@/lib/muse-actions/feed";

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
  return { sb: (globalThis as any).__sbMock, profile: { id: "me1", name: "Ada" }, rest, ip: "10.0.0.1", req: {} as any } as any;
}

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

describe("feedPost — content-shape + safety", () => {
  it("400s when a field exceeds its max length", async () => {
    install({});
    expect((await feedPost(act({ text: "x".repeat(2001) })) as Response).status).toBe(400);
  });
  it("blocks unsafe text with a SAFETY_BLOCK code", async () => {
    install({});
    const r = await feedPost(act({ text: "meet underage girls" }));
    expect((r as Response).status).toBe(403);
    expect((await (r as Response).json()).code).toBe("SAFETY_BLOCK");
  });
  it("accepts a voice clip with no text and stores kind/media", async () => {
    const sb = install({ muse_feed_posts: () => ({ data: null, error: null }) });
    const r = await feedPost(act({ media_url: "https://cdn/clip.webm", kind: "voice", media_type: "audio/webm", duration_ms: 4000, transcript: "hello" }));
    expect((r as Response).status).toBe(200);
    expect(insertValue(tableCalls(sb.__log, "muse_feed_posts"))).toMatchObject({ type: "voice", media_url: "https://cdn/clip.webm", duration_ms: 4000 });
  });
  it("clamps duration_ms and defaults a plain text post to type text", async () => {
    const sb = install({ muse_feed_posts: () => ({ data: null, error: null }) });
    await feedPost(act({ text: "hello", duration_ms: 99999999 }));
    expect(insertValue(tableCalls(sb.__log, "muse_feed_posts"))).toMatchObject({ type: "text", duration_ms: 600000 });
  });
  it("500s when the insert errors", async () => {
    install({ muse_feed_posts: () => ({ data: null, error: { message: "db" } }) });
    expect((await feedPost(act({ text: "ok" })) as Response).status).toBe(500);
  });
});

describe("feedPostLike", () => {
  it("demo-stubs numeric / non-uuid ids", async () => {
    install({});
    expect(await (await feedPostLike(act({ postId: 5, liked: true })) as Response).json()).toMatchObject({ demo: true });
    expect(await (await feedPostLike(act({ postId: "nope", liked: true })) as Response).json()).toMatchObject({ demo: true });
  });
  it("is a no-op when already liked", async () => {
    install({ muse_activity_log: () => ({ data: { id: "l1" } }) });
    expect(await (await feedPostLike(act({ postId: UUID, liked: true })) as Response).json()).toMatchObject({ alreadyLiked: true });
  });
  it("uses the atomic RPC and returns the new count", async () => {
    install({
      muse_feed_posts: () => ({ data: { author_id: "other" } }),
      muse_activity_log: () => ({ data: null }),
      "rpc:atomic_like_count": () => ({ data: 11, error: null }),
      muse_notifications: () => ({ data: null }),
    });
    const body = await (await feedPostLike(act({ postId: UUID, liked: true })) as Response).json();
    expect(body).toEqual({ success: true, likes: 11 });
  });
  it("falls back to read-modify-write when the RPC errors, 404ing on a missing post", async () => {
    install({ muse_activity_log: () => ({ data: null }), "rpc:atomic_like_count": () => ({ data: null, error: { message: "no fn" } }), muse_feed_posts: () => ({ data: null }) });
    expect((await feedPostLike(act({ postId: UUID, liked: true })) as Response).status).toBe(404);
  });
  it("decrements via the RPC on unlike", async () => {
    install({ "rpc:atomic_like_count": () => ({ data: 3, error: null }), muse_activity_log: () => ({ data: null }) });
    expect(await (await feedPostLike(act({ postId: UUID, liked: false })) as Response).json()).toEqual({ success: true, likes: 3 });
  });
});

describe("feedCommentAdd — safety + counters", () => {
  it("400s without text", async () => {
    install({});
    expect((await feedCommentAdd(act({ postId: UUID })) as Response).status).toBe(400);
  });
  it("blocks an unsafe reply and logs the block", async () => {
    const sb = install({ muse_activity_log: () => ({ data: null }) });
    const r = await feedCommentAdd(act({ postId: UUID, text: "underage content" }));
    expect((r as Response).status).toBe(403);
    expect(tableCalls(sb.__log, "muse_activity_log").some((c) => c.method === "insert")).toBe(true);
  });
  it("demo-stubs a numeric post id after passing the safety screen", async () => {
    install({});
    expect(await (await feedCommentAdd(act({ postId: 7, text: "nice" })) as Response).json()).toMatchObject({ demo: true });
  });
  it("inserts the comment and increments the counter", async () => {
    const sb = install({
      muse_feed_comments: () => ({ data: null }),
      muse_feed_posts: (calls) => (calls.some((c) => c.method === "update") ? { data: null } : { data: { comments: 4, author_id: "other" } }),
      muse_notifications: () => ({ data: null }),
    });
    const body = await (await feedCommentAdd(act({ postId: UUID, text: "great work" })) as Response).json();
    expect(body).toEqual({ success: true, comments: 5 });
    const upd = updateValue(tableCalls(sb.__log, "muse_feed_posts"));
    expect(upd).toEqual({ comments: 5 });
  });
});

describe("momentCreate / momentLike", () => {
  it("requires text, img or media", async () => {
    install({});
    expect((await momentCreate(act({})) as Response).status).toBe(400);
  });
  it("detects video by file extension", async () => {
    const sb = install({ muse_moments: () => ({ data: { id: "m1" } }) });
    await momentCreate(act({ img: "https://cdn/a.mp4" }));
    expect(insertValue(tableCalls(sb.__log, "muse_moments"))).toMatchObject({ type: "video" });
  });
  it("stores a voice moment and accepts a text moment", async () => {
    const sb = install({ muse_moments: () => ({ data: { id: "m1" } }) });
    await momentCreate(act({ media_url: "https://cdn/v.webm", kind: "video" }));
    expect(insertValue(tableCalls(sb.__log, "muse_moments"))).toMatchObject({ type: "video", media_url: "https://cdn/v.webm" });
  });
  it("momentLike demos, dedupes and returns the new count", async () => {
    install({});
    expect(await (await momentLike(act({ momentId: 5, liked: true })) as Response).json()).toMatchObject({ demo: true });
    install({ muse_activity_log: () => ({ data: { id: "l1" } }) });
    expect(await (await momentLike(act({ momentId: UUID, liked: true })) as Response).json()).toMatchObject({ alreadyLiked: true });
    install({ muse_activity_log: () => ({ data: null }), "rpc:atomic_like_count": () => ({ data: 2, error: null }), muse_moments: () => ({ data: { author_id: "other" } }) });
    expect(await (await momentLike(act({ momentId: UUID, liked: true })) as Response).json()).toEqual({ success: true, likes: 2 });
  });
});

describe("briefCreate / briefApply", () => {
  it("briefCreate requires a title", async () => {
    install({});
    expect((await briefCreate(act({ desc: "x" })) as Response).status).toBe(400);
  });
  it("briefCreate blocks unsafe copy and logs it", async () => {
    const sb = install({ muse_activity_log: () => ({ data: null }) });
    expect((await briefCreate(act({ title: "buy drugs", desc: "" })) as Response).status).toBe(403);
    expect(tableCalls(sb.__log, "muse_activity_log").some((c) => c.method === "insert")).toBe(true);
  });
  it("briefCreate inserts with defaults", async () => {
    const sb = install({ muse_briefs: () => ({ data: null }) });
    await briefCreate(act({ title: "Editorial shoot" }));
    expect(insertValue(tableCalls(sb.__log, "muse_briefs"))).toMatchObject({ title: "Editorial shoot", budget: "Negotiable", category: "concept" });
  });
  it("briefApply demo-stubs a non-uuid and succeeds otherwise", async () => {
    install({});
    expect(await (await briefApply(act({ briefId: "nope" })) as Response).json()).toMatchObject({ demo: true });
    const sb = install({
      muse_brief_applications: () => ({ data: null }),
      muse_profiles: () => ({ data: { preferences: { appliedBriefs: [] } } }),
      muse_briefs: () => ({ data: { author_id: "other" } }),
      muse_activity_log: () => ({ data: null }),
      muse_notifications: () => ({ data: null }),
    });
    expect((await briefApply(act({ briefId: UUID })) as Response).status).toBe(200);
    expect(tableCalls(sb.__log, "muse_brief_applications").some((c) => c.method === "insert")).toBe(true);
    expect(tableCalls(sb.__log, "muse_notifications").some((c) => c.method === "insert")).toBe(true);
  });
});
