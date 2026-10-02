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
 * Phase E also extracted the remaining useEffects into grouped domain hooks
 * under hooks/: useNotificationSync, useQuestTracking, usePreferenceSync,
 * useThemeEffect, useSessionRefresh, useVisualEffects, useToastChannel,
 * useCardAlbumPhotos, useChatEffects, useKeyboardNav, useVisibilityPause,
 * useStoryAutoAdvance, useMountFlags, useViewedProfile, useSavedSearches,
 * useMotionPermission, useBoostExpiry, useSocialConnection,
 * useMessageRequests, usePageTour, useDailyLikesReset, useSaveStateTimer and
 * useSessTabRealign. Only the trivial `matchesRef` sync effect remains inline.
 * Phase F extracted the remaining useCallback handlers into grouped action
 * hooks: hooks/useMuseActions (quest tracking, navigation, social,
 * onboarding multi-select, tours, verification banner, img fallback,
 * setViewProfile), hooks/useAuthActions (handleAuthClick, handleOAuth,
 * doLogout, doLogoutFull), hooks/useChatActions (openChat, sendMsg,
 * sendChatImg, sendChatMedia) and hooks/useProfileActions (saveProfileEdits,
 * uploadImage, uploadMedia). Only apiFetch, showToast, bootstrapData,
 * saveState and loadState remain inline as useCallbacks.
 * Phase G moved state ownership out of page.tsx and into the hooks that
 * already own the behaviour (useCardAlbumPhotos, useMessageRequests,
 * useSavedSearches, useViewedProfile, useMountFlags, useBootstrapHydration,
 * useChatEffects, useNotificationSync, useProfileActions, useStoryAutoAdvance,
 * useMuseActions, useSessTabRealign): 25 useState declarations (card album
 * state, message requests, saved searches, viewed-profile photo index/reviews,
 * verification-banner dismissed/closing, hydrated, myGeo, realtimeStatus,
 * server notification count, the nine profile-edit fields, showStory,
 * activePageTour and sessTab) no longer live in page.tsx.
 * P2 controller-hook split: `bootstrapData` -> hooks/useBootstrapData.ts;
 * `saveState`/`loadState` (+ constants + DEMO_MOMENTS) ->
 * hooks/useMusePersistence.ts (with a parity test); the multi-step onboarding
 * flow -> components/OnboardingFlow.tsx; the auth screen ->
 * components/AuthScreen.tsx; the Discover swipe-deck builder (the ~70-line
 * filteredProfiles useMemo) -> lib/discover-deck.ts (with behaviour tests).
 * Also: VerificationBanner component + lib/confetti.ts helper. Remaining inline
 * useCallbacks: apiFetch, showToast (tiny + ordering-sensitive).
 * P2 total: ~4000 -> ~1224 lines.
 * Good next candidates: the remaining Discover/note-composer state still
 * shared with useSwipeActions.
 */
const BUDGET_LINES = 1224;

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
