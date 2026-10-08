import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Screen size ratchet for the two remaining oversized screens.
 *
 * NetworkScreen (~1.7k lines) and SettingsScreen (~1.6k lines) still hold state,
 * handlers and the whole render tree in one file, which is why XL-2 is to split
 * them the same way page.tsx was split (pages -> components + hooks). This test
 * FREEZES their current size so they cannot keep growing while that extraction
 * lands. Lower a budget whenever a block moves out; NEVER raise one — if you
 * need room, extract a component or hook first.
 */
const BUDGETS: Record<string, number> = {
  "screens/NetworkScreen.tsx": 1760,
  "screens/SettingsScreen.tsx": 1601,
};

describe("oversized screens size ratchet", () => {
  for (const [rel, budget] of Object.entries(BUDGETS)) {
    it(`${rel} does not grow beyond ${budget} lines`, () => {
      const file = path.resolve(__dirname, rel);
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
      expect(
        lines,
        `${rel} grew to ${lines} lines (budget ${budget}). Extract a component/hook instead of adding to it.`,
      ).toBeLessThanOrEqual(budget);
    });
  }
});
