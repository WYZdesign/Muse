import { describe, it, expect } from "vitest";
import { toProfessionalRow } from "./professionalSearch";

describe("toProfessionalRow", () => {
  it("maps a muse_profiles row into the professionals shape", () => {
    const row = toProfessionalRow({
      id: "p1",
      name: "Elena",
      type: "Casting Director",
      avatar: "https://x/a.jpg",
      styles: ["Fashion", "Editorial"],
      loc: "Los Angeles, CA",
    });
    expect(row.img).toBe("https://x/a.jpg");
    expect(row.skills).toEqual(["Fashion", "Editorial"]);
    expect(row.exp).toBe("");
    expect(row.rate).toBe("");
    expect(row.openings).toBe(0);
    expect(row.looking).toEqual([]);
    expect(row.nsfw).toBe(false);
    expect(row.profileId).toBe("p1");
  });

  it("preserves real professional fields when present", () => {
    const row = toProfessionalRow({
      id: 4,
      img: "https://x/b.jpg",
      exp: "10 years",
      openings: 7,
      rate: "$110/hr",
      skills: ["Body Art"],
      looking: ["Models"],
      nsfw: true,
    });
    expect(row.img).toBe("https://x/b.jpg");
    expect(row.exp).toBe("10 years");
    expect(row.openings).toBe(7);
    expect(row.rate).toBe("$110/hr");
    expect(row.skills).toEqual(["Body Art"]);
    expect(row.looking).toEqual(["Models"]);
    expect(row.nsfw).toBe(true);
  });

  it("never leaves skills/looking as undefined for the render", () => {
    const row = toProfessionalRow({ id: "x" });
    expect(Array.isArray(row.skills)).toBe(true);
    expect(Array.isArray(row.looking)).toBe(true);
  });
});
