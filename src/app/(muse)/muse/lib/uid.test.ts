import { describe, it, expect, vi } from "vitest";
import { uid } from "./uid";

describe("uid", () => {
  it("returns unique, non-decreasing ids", () => {
    const ids = Array.from({ length: 1000 }, () => uid());
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1]);
  });

  it("increments the counter within the same millisecond", () => {
    vi.spyOn(Date, "now").mockReturnValue(5000);
    const a = uid();
    const b = uid();
    expect(b - a).toBe(1);
    vi.restoreAllMocks();
  });

  it("resets the counter when the millisecond advances", () => {
    vi.spyOn(Date, "now").mockReturnValue(6000);
    const a = uid();
    vi.spyOn(Date, "now").mockReturnValue(6001);
    const b = uid();
    expect(b).toBe(6001 * 1000);
    expect(b).toBeGreaterThan(a);
    vi.restoreAllMocks();
  });
});
