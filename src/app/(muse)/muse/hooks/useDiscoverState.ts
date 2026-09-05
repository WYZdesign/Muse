"use client";
import { useState } from "react";
import type { Match } from "../components/types";

/**
 * Discover/swipe state, extracted from page.tsx. This is the last and
 * riskiest cluster in the page.tsx state extraction (per wyzmind's handoff)
 * — swipe mechanics, daily like/super-like limits, boost timers, and card
 * navigation all interact, so it was saved for last, after the modal-
 * visibility, quests, and auth/onboarding extractions proved the pattern
 * held up under real verification.
 *
 * This is a pure relocation, same as the three before it: every showX/setX
 * name is unchanged, so every call site in page.tsx (including the boost
 * countdown useEffect, the swipe/rewind handlers, and DiscoverScreen's
 * props) is untouched. Functional updaters (setSuperLikes(prev => ...),
 * setRewindStack(prev => [...prev, currentIdx])) and stable setter
 * identities used in useCallback/useMemo dependency arrays both continue to
 * work exactly as before — moving a useState call into a hook doesn't
 * change React's setter-identity guarantees.
 */
export function useDiscoverState() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showMatchOverlay, setShowMatchOverlay] = useState<Match | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [boostActive, setBoostActive] = useState(false);
  const [boostEnd, setBoostEnd] = useState(0);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [mapView, setMapView] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [dailyLikes, setDailyLikes] = useState(10);
  const [superLikes, setSuperLikes] = useState(3);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [rewindStack, setRewindStack] = useState<number[]>([]);
  const [discoverSearchOpen, setDiscoverSearchOpen] = useState(false);
  const [filterStyles, setFilterStyles] = useState<string[]>([]);
  const [filterScore, setFilterScore] = useState(50);

  return {
    currentIdx, setCurrentIdx,
    showMatchOverlay, setShowMatchOverlay,
    showConfetti, setShowConfetti,
    swipeDir, setSwipeDir,
    expandedMatchId, setExpandedMatchId,
    boostActive, setBoostActive,
    boostEnd, setBoostEnd,
    discoverSearch, setDiscoverSearch,
    mapView, setMapView,
    discoverLoading, setDiscoverLoading,
    dailyLikes, setDailyLikes,
    superLikes, setSuperLikes,
    screenFlash, setScreenFlash,
    rewindStack, setRewindStack,
    discoverSearchOpen, setDiscoverSearchOpen,
    filterStyles, setFilterStyles,
    filterScore, setFilterScore,
  };
}
