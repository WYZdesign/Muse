import { describe, expect, it } from "vitest";
import { STRINGS } from "@/lib/strings";

describe("STRINGS", () => {
  it("exposes the shared action labels", () => {
    expect(STRINGS).toEqual({
      cancel: "Cancel",
      close: "Close",
      save: "Save",
      block: "Block",
      unmatch: "Unmatch",
    });
  });
});
