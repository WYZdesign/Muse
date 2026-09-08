import { describe, it, expect } from "vitest";
import { normalizeBrief } from "./normalizers";

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
