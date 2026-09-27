import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * page.tsx size ratchet.
 *
 * page.tsx is the app controller: state, hydration, handlers and the whole
 * render tree in one file. It had grown to ~4,000 lines / 310 KB, which made it
 * impractical to work on. Codex extracted 31 hooks + page-constants/page-models,
 * but the split is incomplete.
 *
 * This test FREEZES the current size so the file cannot keep growing while the
 * remaining extraction lands. Lower the budget whenever a block moves out.
 * NEVER raise it — if you need room, extract a hook or component first.
 *
 * Already extracted (examples): page-constants.ts, page-models.ts,
 * page-helpers.ts (getIcebreaker/getReferralTier/checkProfileBadges/sanitizeInput),
 * hooks/useSessionApply.ts (`applySession`), hooks/useBootstrapHydration.ts
 * (the mount bootstrap/hydration effect), hooks/useSwipeActions.ts (doSwipe,
 * doRewind, doLikeWithNote and the four pointer-drag handlers),
 * modals/ (the end-of-tree modal stack via `MuseModals`, plus the
 * `IntentPickerModal` rendered at its original position).
 * Good next candidates: the screens still mounted inside `page.tsx`.
 */
const BUDGET_LINES = 2830;

const file = path.resolve(__dirname, "page.tsx");

describe("page.tsx size ratchet", () => {
  it("does not grow beyond the frozen budget", () => {
    const src = fs.readFileSync(file, "utf8");
    const lines = src.split(/\r?\n/).length;

    expect(
      lines,
      `page.tsx grew to ${lines} lines (budget ${BUDGET_LINES}). Extract a hook/component instead of adding to it — see page-constants.ts / page-helpers.ts / page-models.ts for the established pattern.`,
    ).toBeLessThanOrEqual(BUDGET_LINES);
  });
});
