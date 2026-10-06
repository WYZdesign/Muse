// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useSwipeActions } from "./useSwipeActions";

afterEach(() => cleanup());

function args(over: Record<string, unknown> = {}) {
  return {
    swipeLocked: { current: false },
    dragRef: { current: { startX: 0, startY: 0, active: false, relY: 0, startTime: 0, el: null, axis: null } },
    dragValuesRef: { current: { x: 0, y: 0, opacity: 0 } },
    rafRef: { current: 0 },
    likeLabelRef: { current: null }, nopeLabelRef: { current: null }, superLabelRef: { current: null },
    currentIdx: 0, dailyLikes: 10, superLikes: 3, filteredProfiles: [], isUnlimited: false,
    obData: {}, userDefaultIntent: "", rewindStack: [],
    setSwipeDir: vi.fn(), setUpsell: vi.fn(), setIntentProfile: vi.fn(), setIntentSelection: vi.fn(), setShowIntentPicker: vi.fn(),
    setMatches: vi.fn(), setMatchStreak: vi.fn(), setShowMatchOverlay: vi.fn(), setShowConfetti: vi.fn(), setExpandedMatchId: vi.fn(),
    setActivityFeed: vi.fn(), setMatchAnimVariant: vi.fn(), setSuperLikes: vi.fn(), setDailyLikes: vi.fn(), setCurrentUser: vi.fn(),
    setRewindStack: vi.fn(), setCurrentIdx: vi.fn(), setCurrentPhotoIdx: vi.fn(), setPortfolioPhotoIdx: vi.fn(), setPromptIdx: vi.fn(),
    setCardScrolled: vi.fn(), setShowNoteTooltip: vi.fn(), setNoteTargetProfile: vi.fn(), setLikeNoteAnchor: vi.fn(), setLikeNoteText: vi.fn(), setShowLikeNote: vi.fn(),
    announce: vi.fn(), trackQuest: vi.fn(), analytics: { messageSend: vi.fn() }, calcMatch: vi.fn(() => "smooth"),
    showToast: vi.fn(), authFetch: vi.fn(async () => new Response("{}", { status: 200 })),
    flash: vi.fn(), uid: () => 1, safeSetItem: () => true, DEMO_MODE: false,
    ...over,
  };
}

describe("useSwipeActions", () => {
  it("exposes the gesture handlers", () => {
    const { result } = renderHook(() => useSwipeActions(args() as never));
    for (const k of ["doSwipe", "doRewind", "doLikeWithNote", "onPointerDown", "onPointerMove", "onPointerUp", "onPointerCancel"]) {
      expect(typeof (result.current as Record<string, unknown>)[k], k).toBe("function");
    }
  });

  it("does nothing on rewind with an empty stack", () => {
    const a = args();
    const { result } = renderHook(() => useSwipeActions(a as never));
    expect(() => result.current.doRewind()).not.toThrow();
    expect(a.setCurrentIdx).not.toHaveBeenCalled();
  });
});
