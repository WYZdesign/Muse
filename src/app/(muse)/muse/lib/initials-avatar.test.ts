import { describe, expect, it } from "vitest";
import { initialsAvatarUrl } from "./initials-avatar";

describe("initialsAvatarUrl", () => {
  it("is deterministic for the same profile identity", () => {
    expect(initialsAvatarUrl("Maya Chen", "maya-1")).toBe(
      initialsAvatarUrl("Maya Chen", "maya-1"),
    );
  });

  it("creates a self-contained SVG fallback with the profile initials", () => {
    const avatar = initialsAvatarUrl("Maya Chen", "maya-1");

    expect(avatar).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(decodeURIComponent(avatar)).toContain(">MC</text>");
    expect(avatar).not.toMatch(/^https?:/);
  });

  it("uses a safe fallback for an empty display name", () => {
    expect(decodeURIComponent(initialsAvatarUrl("", "anonymous"))).toContain(">M</text>");
  });
});
