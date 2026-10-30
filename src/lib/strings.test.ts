import { describe, expect, it } from "vitest";
import { STRINGS, t } from "@/lib/strings";

describe("STRINGS", () => {
  it("exposes the shared action labels", () => {
    expect(STRINGS.cancel).toBe("Cancel");
    expect(STRINGS.close).toBe("Close");
    expect(STRINGS.save).toBe("Save");
    expect(STRINGS.block).toBe("Block");
    expect(STRINGS.unmatch).toBe("Unmatch");
  });

  it("provides a locale lookup that falls back to English", () => {
    expect(t("cancel")).toBe("Cancel");
    expect(t("cancel", "en")).toBe("Cancel");
    expect(t("cancel", "xx")).toBe("Cancel");
    expect(t("copied")).toBe("Copied");
    expect(t("signOut")).toBe("Sign out");
  });

  it("every value is a non-empty string", () => {
    for (const [key, val] of Object.entries(STRINGS)) {
      expect(typeof val, key).toBe("string");
      expect(val.length, key).toBeGreaterThan(0);
    }
  });
});
