import { describe, it, expect } from "vitest";
import { matchesBriefSearch, matchesSessionSearch } from "./searchMatch";

// These two predicates back the free-text search added to Collab briefs and
// Sessions Browse (audit findings taskrabbit-p2-1 / thumbtack-p2-1). Locking
// in: empty query matches everything, matching is case-insensitive, and
// each documented field (title/desc/author/tags for briefs; name/type/
// skills for sessions) is actually searched — not just the first one.
describe("matchesBriefSearch", () => {
  const brief = { title: "Editorial Shoot", desc: "Studio lighting, downtown LA", author: "Jordan Rivera", tags: ["Fashion", "Studio"] };

  it("matches everything when the query is empty or whitespace", () => {
    expect(matchesBriefSearch(brief, "")).toBe(true);
    expect(matchesBriefSearch(brief, "   ")).toBe(true);
  });

  it("matches on title, case-insensitively", () => {
    expect(matchesBriefSearch(brief, "editorial")).toBe(true);
  });

  it("matches on description", () => {
    expect(matchesBriefSearch(brief, "downtown")).toBe(true);
  });

  it("matches on author", () => {
    expect(matchesBriefSearch(brief, "rivera")).toBe(true);
  });

  it("matches on tags", () => {
    expect(matchesBriefSearch(brief, "fashion")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(matchesBriefSearch(brief, "wedding")).toBe(false);
  });

  it("doesn't throw on a brief missing every optional field", () => {
    expect(matchesBriefSearch({}, "anything")).toBe(false);
    expect(matchesBriefSearch({}, "")).toBe(true);
  });
});

describe("matchesSessionSearch", () => {
  const session = { name: "Maya Chen", type: "Photographer", skills: ["Portrait", "Fashion", "Editorial"] };

  it("matches everything when the query is empty", () => {
    expect(matchesSessionSearch(session, "")).toBe(true);
  });

  it("matches on name, case-insensitively", () => {
    expect(matchesSessionSearch(session, "MAYA")).toBe(true);
  });

  it("matches on type", () => {
    expect(matchesSessionSearch(session, "photographer")).toBe(true);
  });

  it("matches on a skill", () => {
    expect(matchesSessionSearch(session, "portrait")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(matchesSessionSearch(session, "composer")).toBe(false);
  });

  it("doesn't throw on a session missing every optional field", () => {
    expect(matchesSessionSearch({}, "anything")).toBe(false);
  });
});
