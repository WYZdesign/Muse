import { describe, it, expect } from "vitest";
import { MUSE_KNOWLEDGE_BASE, museSystemPrompt } from "./aiDocs";

describe("MUSE_KNOWLEDGE_BASE", () => {
  it("has a comprehensive set of docs", () => {
    expect(MUSE_KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(15);
  });

  it("covers the critical sections", () => {
    const sections = new Set(MUSE_KNOWLEDGE_BASE.map((d) => d.section));
    for (const required of ["about", "bookings", "safety", "moderation", "verification", "legal", "support", "disclosures"]) {
      expect(sections.has(required)).toBe(true);
    }
  });

  it("has title + content for every doc", () => {
    for (const d of MUSE_KNOWLEDGE_BASE) {
      expect(d.title.trim().length).toBeGreaterThan(0);
      expect(d.content.trim().length).toBeGreaterThan(20);
    }
  });

  it("has unique titles (used as upsert key)", () => {
    const titles = MUSE_KNOWLEDGE_BASE.map((d) => d.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("museSystemPrompt", () => {
  it("identifies the platform and support channel", () => {
    const p = museSystemPrompt();
    expect(p).toContain("Muse");
    expect(p).toContain("muse.wyzdesign.com");
    expect(p).toContain("info@wyzdesign.com");
  });

  it("instructs against inventing features", () => {
    expect(museSystemPrompt()).toContain("Never invent");
  });
});
