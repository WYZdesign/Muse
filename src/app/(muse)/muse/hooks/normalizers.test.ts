import { describe, it, expect } from "vitest";
import { normalizeBrief, normalizeFeedPost, normalizeProfile } from "./normalizers";

// normalizeFeedPost flattens a raw muse_feed_posts row (joined author, UUID id)
// into the flat shape FeedScreen renders, and must be idempotent because
// bootstrapData and useFeedData both fetch type=feed independently and
// whichever resolves last must not clobber the other (the documented
// blank-author / doubled-post regression).
describe("normalizeFeedPost — raw row -> render shape", () => {
  const raw = {
    id: "p1",
    author_id: { name: "Ada", avatar: "a.jpg", id: "u9", verified: true },
    text: "hello",
    img: "photo.jpg",
    created_at: "2026-01-01T12:00:00Z",
    likes: 3,
    liked_by: ["u1", "u2"],
  };

  it("lifts author/avatar/id out of the join and infers type", () => {
    const p = normalizeFeedPost(raw);
    expect(p.author).toBe("Ada");
    expect(p.avatar).toBe("a.jpg");
    expect(p.rid).toBe("u9");
    expect(p.authorVerified).toBe(true);
    expect(p.type).toBe("photo");
    expect(p.media).toEqual(["photo.jpg"]);
    expect(typeof p.createdAt).toBe("number");
  });

  it("derives liked from liked_by when the viewer is present", () => {
    expect(normalizeFeedPost(raw, "u1").liked).toBe(true);
    expect(normalizeFeedPost(raw, "zzz").liked).toBe(false);
  });

  it("treats an image-less post as text with no media", () => {
    const p = normalizeFeedPost({ id: "p2", text: "hi", author_id: { name: "Bo" } });
    expect(p.type).toBe("text");
    expect(p.media).toEqual([]);
  });

  it("is idempotent — re-normalizing keeps author/type/createdAt stable", () => {
    const once = normalizeFeedPost(raw, "u1");
    const twice = normalizeFeedPost(once, "u1");
    expect(twice.author).toBe("Ada");
    expect(twice.type).toBe("photo");
    expect(twice.createdAt).toBe(once.createdAt);
    expect(twice.liked).toBe(true);
  });
});

describe("normalizeProfile — score/side fallbacks (Discover card)", () => {
  it("falls back to matchScore then 70 for the match bar", () => {
    expect(normalizeProfile({ id: "a", matchScore: 88 }).score).toBe(88);
    expect(normalizeProfile({ id: "b" }).score).toBe(70);
  });

  it("maps life_path -> lifePath and defaults fields", () => {
    const p = normalizeProfile({ id: "c", life_path: 7 });
    expect(p.lifePath).toBe(7);
    expect(p.name).toBe("Creative");
    expect(p.loc).toBe("Unknown");
    expect(typeof p.side).toBe("string");
  });

  it("honors an explicit showDistance=false", () => {
    expect(normalizeProfile({ id: "d", showDistance: false }).showDistance).toBe(false);
    expect(normalizeProfile({ id: "e" }).showDistance).toBe(true);
  });
});

// normalizeBrief unpacks the PostgREST embedded-count shape
// (muse_brief_applications: [{ count: N }]) that get.ts's "briefs" query
// returns, into a flat applicantCount CollabScreen.tsx can read directly —
// see get.ts's "briefs" GET handler and CollabScreen.tsx's "👥 N applied"
// line (shown only to a brief's own author).
describe("normalizeBrief — applicantCount", () => {
  it("unpacks a non-zero embedded count", () => {
    const b = normalizeBrief({ id: "b1", muse_brief_applications: [{ count: 5 }] });
    expect(b.applicantCount).toBe(5);
  });

  it("defaults to 0 when the embedded array has a zero count", () => {
    const b = normalizeBrief({ id: "b2", muse_brief_applications: [{ count: 0 }] });
    expect(b.applicantCount).toBe(0);
  });

  it("defaults to 0 when muse_brief_applications is missing entirely (demo/local briefs)", () => {
    const b = normalizeBrief({ id: "b3", title: "Local draft" });
    expect(b.applicantCount).toBe(0);
  });

  it("is idempotent — re-normalizing an already-normalized brief keeps the same count", () => {
    const once = normalizeBrief({ id: "b4", muse_brief_applications: [{ count: 2 }] });
    const twice = normalizeBrief(once);
    expect(twice.applicantCount).toBe(2);
  });

  it("still fills in the existing author/desc/cat fallbacks alongside the new field", () => {
    const b = normalizeBrief({ id: "b5", description: "Shoot for a lookbook", category: "paid", author_id: { name: "Ada", avatar: "a.jpg" } });
    expect(b.desc).toBe("Shoot for a lookbook");
    expect(b.cat).toBe("paid");
    expect(b.author).toBe("Ada");
    expect(b.authorImg).toBe("a.jpg");
    expect(b.applicantCount).toBe(0);
  });
});
