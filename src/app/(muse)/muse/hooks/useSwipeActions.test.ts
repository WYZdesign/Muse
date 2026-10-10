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
    announce: vi.fn(), trackQuest: vi.fn(), analytics: { messageSend: vi.fn(), discoverSwipe: vi.fn(), discoverMatch: vi.fn() }, calcMatch: vi.fn(() => "smooth"),
    showToast: vi.fn(), authFetch: vi.fn(async () => new Response("{}", { status: 200 })),
    flash: vi.fn(), uid: () => 1, safeSetItem: () => true, DEMO_MODE: false,
    ...over,
  };
}

const DECK = [
  { id: "p1", name: "One", type: "Model" },
  { id: "p2", name: "Two", type: "Model" },
  { id: "p3", name: "Three", type: "Model" },
];

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

  // Requirement: every placeholder (demo) card on Discover must be swipeable.
  // These pin the deck advance so a change to the swipe logic cannot silently
  // leave cards stuck on the first one.

  it("advances to the next placeholder card on a pass (left swipe)", () => {
    const a = args({ filteredProfiles: DECK, currentIdx: 0 });
    const { result } = renderHook(() => useSwipeActions(a as never));
    result.current.doSwipe("left");
    expect(a.setCurrentIdx).toHaveBeenCalledTimes(1);
    const up = a.setCurrentIdx.mock.calls[0][0];
    expect(typeof up).toBe("function");
    expect(up(0)).toBe(1);
    expect(a.setRewindStack).toHaveBeenCalled();
  });

  it("advances on a right swipe when a default intent is set", () => {
    const a = args({ filteredProfiles: DECK, currentIdx: 1, userDefaultIntent: "collab", DEMO_MODE: true });
    const { result } = renderHook(() => useSwipeActions(a as never));
    result.current.doSwipe("right");
    expect(a.setCurrentIdx).toHaveBeenCalledTimes(1);
    expect(a.setCurrentIdx.mock.calls[0][0](1)).toBe(2);
    expect(a.setShowIntentPicker).not.toHaveBeenCalled();
  });

  it("advances on super like", () => {
    const a = args({ filteredProfiles: DECK, currentIdx: 0, userDefaultIntent: "collab", DEMO_MODE: true });
    const { result } = renderHook(() => useSwipeActions(a as never));
    result.current.doSwipe("super");
    expect(a.setCurrentIdx).toHaveBeenCalledTimes(1);
  });

  it("asks for an intent before advancing on a right swipe with no default", () => {
    const a = args({ filteredProfiles: DECK, currentIdx: 0, userDefaultIntent: "" });
    const { result } = renderHook(() => useSwipeActions(a as never));
    result.current.doSwipe("right");
    expect(a.setShowIntentPicker).toHaveBeenCalledWith(true);
    expect(a.setCurrentIdx).not.toHaveBeenCalled();
  });

  it("does not advance past the end of the deck", () => {
    const a = args({ filteredProfiles: DECK, currentIdx: DECK.length });
    const { result } = renderHook(() => useSwipeActions(a as never));
    result.current.doSwipe("left");
    expect(a.setCurrentIdx).not.toHaveBeenCalled();
  });

  // Gesture-level tests: the regression these pin is in onPointerDown, not in
  // doSwipe. `.card-info-scroll` sits at z-index 2 over the whole card, so it is
  // the reported target for a drag started anywhere on the photo — the handler
  // used to return before arming, which meant the deck only advanced from the
  // radial-menu buttons no matter how far the card was dragged.

  /** A card whose photo surface is covered by the info-scroll overlay. */
  function makeCard() {
    const card = document.createElement("div");
    card.className = "swipe-card top-card";
    const hero = document.createElement("div");
    hero.className = "card-hero";
    const info = document.createElement("div");
    info.className = "card-info-scroll";
    hero.appendChild(info);
    card.appendChild(hero);
    document.body.appendChild(card);
    return { card, info };
  }

  const ev = (over: Record<string, unknown>) =>
    ({
      pointerType: "mouse",
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 200,
      ...over,
    }) as never;

  it("arms a drag reported on .card-info-scroll and advances on release", async () => {
    const a = args({ filteredProfiles: DECK, currentIdx: 0 });
    const { result } = renderHook(() => useSwipeActions(a as never));
    const { card, info } = makeCard();

    result.current.onPointerDown(ev({ target: info, currentTarget: card }));
    // Horizontal: dy 0, dx -120 clears the 1.5x dominance rule.
    result.current.onPointerMove(ev({ target: info, currentTarget: card, clientX: -20 }));
    result.current.onPointerUp(ev({ target: info, currentTarget: card, clientX: -20 }));

    // The commit is deferred while the card flies out: doSwipe animates the
    // connected element for 380ms, then swaps to the next profile. Nothing
    // advances until that swap lands.
    await new Promise((r) => setTimeout(r, 450));

    expect(a.setSwipeDir).toHaveBeenCalledWith("left");
    expect(a.setCurrentIdx).toHaveBeenCalledTimes(1);
    expect(a.setCurrentIdx.mock.calls[0][0](0)).toBe(1);
    document.body.removeChild(card);
  });

  it("releases a vertical drag on the same surface without swiping", async () => {
    const a = args({ filteredProfiles: DECK, currentIdx: 0 });
    const { result } = renderHook(() => useSwipeActions(a as never));
    const { card, info } = makeCard();

    result.current.onPointerDown(ev({ target: info, currentTarget: card }));
    result.current.onPointerMove(ev({ target: info, currentTarget: card, clientY: 320 }));
    result.current.onPointerUp(ev({ target: info, currentTarget: card, clientY: 320 }));

    expect(a.setCurrentIdx).not.toHaveBeenCalled();
    document.body.removeChild(card);
  });

  it("does not arm a drag for taps on the card's buttons", () => {
    const a = args({ filteredProfiles: DECK, currentIdx: 0 });
    const { result } = renderHook(() => useSwipeActions(a as never));
    const { card } = makeCard();
    const btn = document.createElement("button");
    btn.className = "card-action-btn";
    card.appendChild(btn);

    result.current.onPointerDown(ev({ target: btn, currentTarget: card }));
    result.current.onPointerMove(ev({ target: btn, currentTarget: card, clientX: -20 }));
    result.current.onPointerUp(ev({ target: btn, currentTarget: card, clientX: -20 }));

    expect(a.setCurrentIdx).not.toHaveBeenCalled();
    document.body.removeChild(card);
  });
});
