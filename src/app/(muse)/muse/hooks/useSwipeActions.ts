"use client";

import { useCallback, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import type { CurrentUser } from "../page-models";
import type { LikeAnchor, Match, Profile } from "../components/types";
import type { OnboardingData } from "./useAuthOnboardingState";

/**
 * Discover swipe / pointer interaction handlers, extracted verbatim from
 * page.tsx. Covers the whole gesture group: `doSwipe` (the large, metered
 * like/pass/super-like pipeline), `doRewind`, `doLikeWithNote`, and the four
 * pointer handlers that drive the physical drag (`onPointerDown`,
 * `onPointerMove`, `onPointerUp`, `onPointerCancel`). Pure relocation: every
 * state setter, ref and module helper they closed over is supplied through a
 * single options object, so the hook does not reach into page scope. The
 * useCallback dependency arrays are unchanged, so swipe-lock/timer semantics,
 * thresholds and callback identities are identical to the original.
 */
export type UseSwipeActionsArgs = {
  swipeLocked: { current: boolean };
  dragRef: { current: { startX: number; startY: number; active: boolean; relY: number; startTime: number; el: HTMLElement | null; axis: "x" | "y" | null } };
  dragValuesRef: { current: { x: number; y: number; opacity: number } };
  rafRef: { current: number };
  likeLabelRef: { current: HTMLDivElement | null };
  nopeLabelRef: { current: HTMLDivElement | null };
  superLabelRef: { current: HTMLDivElement | null };
  currentIdx: number;
  dailyLikes: number;
  superLikes: number;
  filteredProfiles: Profile[];
  isUnlimited: boolean;
  obData: OnboardingData;
  userDefaultIntent: string;
  rewindStack: number[];
  setSwipeDir: Dispatch<SetStateAction<"left" | "right" | null>>;
  setUpsell: Dispatch<SetStateAction<{ feature: string; reason: string; icon?: string } | null>>;
  setIntentProfile: Dispatch<SetStateAction<Profile | null>>;
  setIntentSelection: Dispatch<SetStateAction<string[]>>;
  setShowIntentPicker: Dispatch<SetStateAction<boolean>>;
  setMatches: Dispatch<SetStateAction<Match[]>>;
  setMatchStreak: Dispatch<SetStateAction<number>>;
  setShowMatchOverlay: Dispatch<SetStateAction<Match | null>>;
  setShowConfetti: Dispatch<SetStateAction<boolean>>;
  setExpandedMatchId: Dispatch<SetStateAction<string | null>>;
  setActivityFeed: Dispatch<SetStateAction<{ id: number; type: string; from: string; avatar: string; text: string; time: string; read: boolean }[]>>;
  setMatchAnimVariant: Dispatch<SetStateAction<number>>;
  setSuperLikes: Dispatch<SetStateAction<number>>;
  setDailyLikes: Dispatch<SetStateAction<number>>;
  setCurrentUser: Dispatch<SetStateAction<CurrentUser>>;
  setRewindStack: Dispatch<SetStateAction<number[]>>;
  setCurrentIdx: Dispatch<SetStateAction<number>>;
  setCurrentPhotoIdx: Dispatch<SetStateAction<number>>;
  setPortfolioPhotoIdx: Dispatch<SetStateAction<number>>;
  setPromptIdx: Dispatch<SetStateAction<number>>;
  setCardScrolled: Dispatch<SetStateAction<boolean>>;
  setShowNoteTooltip: Dispatch<SetStateAction<boolean>>;
  setNoteTargetProfile: Dispatch<SetStateAction<Profile | null>>;
  setLikeNoteAnchor: Dispatch<SetStateAction<LikeAnchor | null>>;
  setLikeNoteText: Dispatch<SetStateAction<string>>;
  setShowLikeNote: Dispatch<SetStateAction<boolean>>;
  announce: (msg: string, assertive?: boolean) => void;
  trackQuest: (...actionKeys: string[]) => void | Promise<void>;
  analytics: typeof import("../lib/analytics").analytics;
  calcMatch: typeof import("../components/types").calcMatch;
  showToast: (msg: string) => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  flash: (color: string) => void;
  uid: typeof import("../lib/uid").uid;
  safeSetItem: (key: string, value: string) => boolean;
  DEMO_MODE: boolean;
  MATCH_VARIANTS: typeof import("../page-constants").MATCH_VARIANTS;
};

export function useSwipeActions({
  swipeLocked,
  dragRef,
  dragValuesRef,
  rafRef,
  likeLabelRef,
  nopeLabelRef,
  superLabelRef,
  currentIdx,
  dailyLikes,
  superLikes,
  filteredProfiles,
  isUnlimited,
  obData,
  userDefaultIntent,
  rewindStack,
  setSwipeDir,
  setUpsell,
  setIntentProfile,
  setIntentSelection,
  setShowIntentPicker,
  setMatches,
  setMatchStreak,
  setShowMatchOverlay,
  setShowConfetti,
  setExpandedMatchId,
  setActivityFeed,
  setMatchAnimVariant,
  setSuperLikes,
  setDailyLikes,
  setCurrentUser,
  setRewindStack,
  setCurrentIdx,
  setCurrentPhotoIdx,
  setPortfolioPhotoIdx,
  setPromptIdx,
  setCardScrolled,
  setShowNoteTooltip,
  setNoteTargetProfile,
  setLikeNoteAnchor,
  setLikeNoteText,
  setShowLikeNote,
  announce,
  trackQuest,
  analytics,
  calcMatch,
  showToast,
  authFetch,
  flash,
  uid,
  safeSetItem,
  DEMO_MODE,
  MATCH_VARIANTS,
}: UseSwipeActionsArgs) {
  const doSwipe = useCallback((dir: "left" | "right" | "super", intentOverride?: string) => {
    if (swipeLocked.current) return;
    swipeLocked.current = true;
    setTimeout(() => { swipeLocked.current = false; }, 500);
    setSwipeDir(dir === "left" ? "left" : "right");
    setTimeout(() => setSwipeDir(null), 800);
    if (!isUnlimited && dailyLikes <= 0 && dir === "right") { setUpsell({ feature: "Unlimited Likes", reason: "You've used all your likes for today. Go Pro to like as many creatives as you want, with no daily limit.", icon: "⚡" }); return; }
    const p = filteredProfiles[currentIdx];
    if (!p) return;
    // Non-blocking screen-reader announcement of the swipe outcome. The live
    // status region + announce() helper existed but had no callers (dead code).
    announce(dir === "left" ? `Passed on ${p.name}` : dir === "super" ? `Super liked ${p.name}` : `Liked ${p.name}`);
    if (!isUnlimited && dir === "super" && superLikes <= 0) { setUpsell({ feature: "More Super Likes", reason: "You're out of super likes for today. Musa Pro's unlimited likes means you're never stuck waiting for a reset.", icon: "⚡" }); return; }
    analytics.discoverSwipe(dir as "left" | "right" | "super", String(p.id), p.type);
    if (dir === "right" || dir === "super") {
      const effectiveIntent = intentOverride || userDefaultIntent;
      if (!effectiveIntent) { setIntentProfile(p); setIntentSelection([]); setShowIntentPicker(true); swipeLocked.current = false; return; }
      const intent = dir === "super" ? "super" : effectiveIntent;
      const matchScore = p.matchScore ?? calcMatch({ styles: obData.styles || [], looking: obData.looking || [], zodiac: obData.zodiac, chinese: obData.chinese, mbti: obData.mbti, lifePath: obData.lifePath }, p);
      // Every right-swipe is a real like — the backend `match` action always
      // fires (creating a muse_matches row + notifying the target). `isMatch`
      // only decides whether we show the celebratory "You matched!" overlay;
      // it must NOT swallow the like, or a like on a low-score profile is lost.
       const isMatch = !DEMO_MODE && matchScore > 50;
      // Round 46 fix: this used to call apiFetch, which throws on any
      // non-2xx response (see apiFetch's own `if (!res.ok) throw` a few
      // lines up in this file). The `.then()` below never saw a non-ok
      // response — apiFetch had already thrown by the time it would have
      // run — so every failure (rate limit, blocked, suspended, a genuine
      // 500) landed in the same generic `.catch()` and showed the same
      // unhelpful "Match failed — try again" with no way to tell what
      // actually happened. Switched to authFetch (resolves instead of
      // throwing on non-2xx) so the status/body can actually be inspected,
      // and surfaced the specific cases the server can return
      // (matching.ts's matchCreate: 429 rate limited, 403 blocked/
      // suspended, 400 bad target) instead of one catch-all message.
      if (DEMO_MODE) {
        showToast("Demo interest preview — no person was notified and no match was created.");
      } else authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "match", target_id: p.id, intent }) }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch((): { error?: string } => ({}));
          if (r.status === 429) showToast("You're swiping a bit fast — give it a few seconds and try again");
          else if (r.status === 403) showToast(d?.error || "Can't like this profile right now");
          else showToast(d?.error || "Match failed — try again");
          return;
        }
        const d = await r.json().catch(() => ({}));
        // If the server reported this is a mutual match (target already liked
        // us), surface the overlay even below the client score threshold.
        if (d?.matched && !isMatch) {
          const newMatch: Match = { ...p, messages: [] };
          setMatches(prev => [...prev, newMatch]);
          setMatchStreak(prev => prev + 1);
          setTimeout(() => {
            setShowMatchOverlay(newMatch);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 1500);
            setExpandedMatchId(String(newMatch.id));
            analytics.discoverMatch(String(p.id), p.type);
            setActivityFeed(prev => [{id:uid(),type:"match",from:p.name,avatar:p.img,text:"You matched with "+p.name+"!",time:"Just now",read:false},...prev]);
            flash("#FFD700");
          }, 450);
        }
      }).catch(() => {
        showToast("Match failed — try again");
      });
      if (isMatch) {
        const newMatch: Match = { ...p, messages: [] };
        setMatches(prev => [...prev, newMatch]);
        setMatchStreak(prev => prev + 1);
        setActivityFeed(prev => [{id:uid(),type:"match",from:p.name,avatar:p.img,text:"You matched with "+p.name+"!",time:"Just now",read:false},...prev]);
        setTimeout(() => {
          setShowMatchOverlay(newMatch);
          setMatchAnimVariant(Math.floor(Math.random() * MATCH_VARIANTS.length));
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
          setExpandedMatchId(String(newMatch.id));
          analytics.discoverMatch(String(p.id), p.type);
          flash("#FFD700");
        }, 450);
      }
      if (dir === "super") { if (!isUnlimited) { setSuperLikes(prev => Math.max(0, prev - 1)); } setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, superLikes: prev.stats.superLikes + 1 } })); flash("#D4A5FF"); }
      else { if (!isUnlimited) { setDailyLikes(prev => Math.max(0, prev - 1)); } }
      setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, likes: prev.stats.likes + 1 } }));
    } else {
      // Passing costs nothing — only Like/Super Like are metered by dailyLikes/superLikes.
      setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, passes: prev.stats.passes + 1 } }));
    }
    const flyEl = (dragRef.current.el && dragRef.current.el.isConnected)
      ? dragRef.current.el
      : (typeof document !== "undefined" ? (document.querySelector('.swipe-card.top-card') as HTMLElement | null) : null);
    if (flyEl) {
      // Keep the outgoing card opaque until it has cleared the clipped deck.
      // Fading it from the first animation frame exposed the queued card behind
      // it, and the old 260ms swap removed the card before its 360ms transform
      // had finished. That produced a visible "peek" during every pass/like.
      flyEl.style.transition = "transform .36s cubic-bezier(.36,0,.66,-0.02)";
      flyEl.style.transform = dir === "super"
        ? "translateY(-130%) scale(0.92)"
        : `translateX(${dir === "right" ? 150 : -150}%) rotate(${dir === "right" ? 24 : -24}deg)`;
      flyEl.style.opacity = "1";
    }
    const swapDelay = flyEl ? 380 : 0;
    const swapToNext = () => {
      setRewindStack(prev => [...prev, currentIdx]);
      setCurrentIdx(prev => prev + 1);
      setCurrentPhotoIdx(0);
      setPortfolioPhotoIdx(0);
      setPromptIdx(0);
      setCardScrolled(false);
    };
    if (swapDelay > 0) setTimeout(swapToNext, swapDelay);
    else swapToNext();
    if (dir === "right" || dir === "super") trackQuest("swipe", "first_swipe", "like_profile");
    else trackQuest("swipe", "first_swipe");
  }, [currentIdx, dailyLikes, superLikes, filteredProfiles, isUnlimited, flash, obData, userDefaultIntent, trackQuest, setCurrentIdx, setDailyLikes, setExpandedMatchId, setMatchAnimVariant, setMatchStreak, setMatches, setRewindStack, setShowConfetti, setShowIntentPicker, setShowMatchOverlay, setSuperLikes, setSwipeDir, showToast]);

  const doRewind = useCallback(() => {
    if (rewindStack.length === 0) { showToast("No profiles left to undo"); return; }
    const prev = rewindStack[rewindStack.length - 1];
    setRewindStack(stack => stack.slice(0, -1));
    setCurrentIdx(prev);
    setCurrentPhotoIdx(0);
    setPortfolioPhotoIdx(0);
    setPromptIdx(0);
    setCardScrolled(false);
    flash("#D4A5FF");
  }, [rewindStack, flash, setCurrentIdx, setRewindStack, showToast]);

  const doLikeWithNote = useCallback((anchor?: LikeAnchor) => {
    setShowNoteTooltip(false); safeSetItem("muse_note_seen","1");
    const p = filteredProfiles[currentIdx];
    if (!p) return;
    if (!isUnlimited && dailyLikes <= 0) { setUpsell({ feature: "Unlimited Likes", reason: "You've used all your likes for today. Go Pro to like as many creatives as you want, with no daily limit.", icon: "⚡" }); return; }
    setNoteTargetProfile(p);
    setLikeNoteAnchor(anchor ?? null);
    // Prefill the note from the anchor (still editable) so the composer opens
    // already pointed at what was tapped — Hinge-style anchored likes.
    setLikeNoteText(anchor
      ? (anchor.type === "prompt" ? `Loved your prompt: "${anchor.value}"` : `Loved your ${anchor.value.toLowerCase()}!`)
      : "");
    setShowLikeNote(true);
  }, [currentIdx, dailyLikes, filteredProfiles, isUnlimited]);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target as HTMLElement;
    const card = e.currentTarget as HTMLElement;
    const cardTop = card.getBoundingClientRect().top;
    const arm = (capture: boolean) => {
      dragRef.current = { startX: e.clientX, startY: e.clientY, active: true, relY: e.clientY - cardTop, startTime: Date.now(), el: card, axis: null };
      if (capture) card.setPointerCapture?.(e.pointerId);
    };
    // `.card-info-scroll` is z-index 2 over `.card-hero` (z-index 1) and spans
    // the whole card, so it is the reported target for almost every point on
    // the photo — including the surface a user actually drags. Returning here
    // without arming meant the gesture could never start, so the deck only
    // advanced from the radial-menu buttons. Arm it, but do NOT capture yet:
    // capturing here steals subsequent pointer events from the scroll
    // container and breaks native vertical scrolling. onPointerMove takes the
    // capture once the gesture proves horizontal, and disarms on vertical.
    if (target.closest && target.closest('.card-info-scroll')) {
      arm(false);
      return;
    }
    if (target.closest && (target.closest('.card-action-btn') || target.closest('.card-portfolio-btn') || target.closest('.card-photo-thumb') || target.closest('button') || target.closest('a'))) return;
    arm(true);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
      if (dragRef.current.axis === null) {
      if (absDx < 5 && absDy < 5) return;
      if (absDy > absDx) {
        // Vertical gesture — release so native scroll takes over.
        dragRef.current.active = false;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        return;
      }
      // Require horizontal movement to be significantly greater than vertical
      // before locking into swipe mode — lets vertical scroll win by default.
      if (absDx < absDy * 1.5) return;
      dragRef.current.axis = "x";
      // Capture only now: the gesture is horizontal, so taking the pointer can
      // no longer interfere with scrolling, and the drag survives the card
      // leaving the cursor on a fast flick. (A gesture armed by the
      // .card-info-scroll branch above started without capture.)
      dragRef.current.el?.setPointerCapture?.(e.pointerId);
    }
    dragValuesRef.current = { x: 0, y: 0, opacity: 0 };
    if (dragRef.current.axis === "x") {
      if (absDx > 5) {
        dragValuesRef.current.x = dx;
        dragValuesRef.current.opacity = Math.min(absDx / 100, 1);
      }
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = dragRef.current.el;
      if (!el) return;
      const v = dragValuesRef.current;
      const rot = dragRef.current.axis === "x" ? v.x * 0.06 : 0;
      el.style.transition = "none";
      el.style.transform = `translate(${v.x}px, ${v.y}px) rotate(${rot}deg)`;
      if (likeLabelRef.current) likeLabelRef.current.style.opacity = (dragRef.current.axis === "x" && v.x > 25) ? String(v.opacity) : "0";
      if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = (dragRef.current.axis === "x" && v.x < -25) ? String(v.opacity) : "0";
    });
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const dx = e.clientX - dragRef.current.startX;
    const committed = dragRef.current.axis === "x" && Math.abs(dx) > 80;
    if (committed) {
      doSwipe(dx > 0 ? "right" : "left");
    }
    const el = dragRef.current.el;
    if (el && !committed) {
      el.style.transition = "transform .42s cubic-bezier(.16,1,.3,1)";
      el.style.transform = "";
    }
    if (likeLabelRef.current) likeLabelRef.current.style.opacity = "0";
    if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = "0";
    if (superLabelRef.current) superLabelRef.current.style.opacity = "0";
  }, [doSwipe]);

  const onPointerCancel = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const el = dragRef.current.el;
    if (el) {
      el.style.transition = "transform .4s cubic-bezier(.4,0,.2,1)";
      el.style.transform = "";
    }
    if (likeLabelRef.current) likeLabelRef.current.style.opacity = "0";
    if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = "0";
    if (superLabelRef.current) superLabelRef.current.style.opacity = "0";
  }, []);

  return { doSwipe, doRewind, doLikeWithNote, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
