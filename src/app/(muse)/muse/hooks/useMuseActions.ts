"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction, type SyntheticEvent } from "react";
import type { Screen } from "../components/types";
import type { Quest, ViewProfile } from "../page-models";
import type { OnboardingData } from "./useAuthOnboardingState";
import { analytics } from "../lib/analytics";
import { tourSeenKey, type TourScreenId } from "../components/pageTourContent";
import { trackError } from "@/lib/errorTracker";

export type MuseToastInput = string | { msg: string; onTap?: () => void; type?: "info" | "success" | "error" };

/**
 * Core page action handlers, extracted verbatim from page.tsx. Covers quest
 * bookkeeping (`trackQuest`, `handleQuestsChange`), navigation (`showScreen`,
 * `goBack`, `openHamburger`), onboarding multi-select (`toggleObMulti`),
 * social connect/disconnect (`toggleSocial`), the per-page tour trigger
 * (`maybeShowPageTour`), the verification-banner dismiss, the screen flash,
 * the contextual-upsell closer, the shared broken-image fallback and the
 * tracked `setViewProfile` wrapper. Pure relocation: every state setter, ref
 * and module helper they closed over is supplied through one options object.
 * `pageTourShownRef` and `viewedSessionRef` move with their only consumers.
 * All useCallback dependency arrays are unchanged.
 */
export type UseMuseActionsArgs = {
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  safeGetItem: (key: string) => string | null;
  safeSetItem: (key: string, value: string) => boolean;
  showToast: (msg: MuseToastInput) => void;
  showDailyLogin: boolean;
  showAgeVerification: boolean;
  showAgeGate: boolean;
  showQuests: boolean;
  showStories: boolean;
  showHamburger: boolean;
  setClaimableQuests: Dispatch<SetStateAction<number>>;
  setNearQuests: Dispatch<SetStateAction<number>>;
  setTopQuests: Dispatch<SetStateAction<{ id: string; title: string; icon: string; progress: number; target: number; color: string }[]>>;
  setLoginStreak: Dispatch<SetStateAction<number>>;
  obData: OnboardingData;
  setObData: Dispatch<SetStateAction<OnboardingData>>;
  obConnectedSocials: Record<string, boolean>;
  setObConnectedSocials: Dispatch<SetStateAction<Record<string, boolean>>>;
  authUser: { id: string; profile?: { id: string } } | null;
  setViewProfileRaw: Dispatch<SetStateAction<ViewProfile | null>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  screenHistoryRef: { current: Screen[] };
  setScreenFlash: Dispatch<SetStateAction<string | null>>;
  setHamburgerScreen: Dispatch<SetStateAction<string>>;
  setShowHamburger: Dispatch<SetStateAction<boolean>>;
  setVerificationBannerDismissed: Dispatch<SetStateAction<boolean>>;
  setUpsell: Dispatch<SetStateAction<{ feature: string; reason: string; icon?: string } | null>>;
};

export function useMuseActions({
  apiFetch,
  safeGetItem,
  safeSetItem,
  showToast,
  showDailyLogin,
  showAgeVerification,
  showAgeGate,
  showQuests,
  showStories,
  showHamburger,
  setClaimableQuests,
  setNearQuests,
  setTopQuests,
  setLoginStreak,
  obData,
  setObData,
  obConnectedSocials,
  setObConnectedSocials,
  authUser,
  setViewProfileRaw,
  setScreen,
  screenHistoryRef,
  setScreenFlash,
  setHamburgerScreen,
  setShowHamburger,
  setVerificationBannerDismissed,
  setUpsell,
}: UseMuseActionsArgs) {
  const [activePageTour, setActivePageTour] = useState<TourScreenId | null>(null);
  const [verificationBannerClosing, setVerificationBannerClosing] = useState(false);
  const pageTourShownRef = useRef<Set<string>>(new Set());
  const viewedSessionRef = useRef<Set<string>>(new Set());

  // Tracked wrapper — counts one view per real profile per session (duality
  // stats plumbing); demo/numeric ids are skipped server-side anyway.
  const setViewProfile = useCallback((p: ViewProfile | null) => {
    setViewProfileRaw(p);
    if (!p) return;
    try {
      const id = String(p?.id ?? "");
      if (!id || !authUser) return;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(id)) return;
      if (viewedSessionRef.current.has(id)) return;
      viewedSessionRef.current.add(id);
      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-view", target_id: id }) }).catch(() => {});
    } catch (e) { console.debug("[page.tsx] viewProfile tracking ignore", e); }
  }, [apiFetch, authUser]);

  const handleImgError = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    if (el.dataset.fallback) return;
    el.dataset.fallback = "1";
    const initial = (el.alt || "").trim().charAt(0).toUpperCase();
    el.style.background = "linear-gradient(135deg, #2a1a3e 0%, #1a0a2e 100%)";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.color = "rgba(255,215,0,0.6)";
    el.style.fontSize = initial ? "1.4em" : "1.8em";
    el.style.fontWeight = "700";
    el.style.fontFamily = "'Playfair Display', serif";
    el.textContent = initial || "\uD83D\uDCF7";
    el.removeAttribute("src");
  }, []);

  // Onboarding multi-select toggle with a hard cap. Toggling off always works;
  // adding beyond the cap is ignored and surfaces a toast instead.
  const toggleObMulti = (field: "looking" | "styles", value: string, max: number) => {
    const arr: string[] = (obData[field as keyof typeof obData] as string[] | undefined) || [];
    if (arr.includes(value)) { setObData(d => ({ ...d, [field]: arr.filter(x => x !== value) })); return; }
    if (arr.length >= max) { showToast(`Max ${max} selected`); return; }
    setObData(d => ({ ...d, [field]: [...arr, value] }));
  };

  const handleQuestsChange = useCallback(async () => {
    try {
      const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-quests" }) });
      const d = await res.json();
      if (Array.isArray(d?.quests)) {
        const quests = d.quests as Quest[];
        setClaimableQuests(quests.filter((q) => q.completed && !q.claimed).length);
        setNearQuests(quests.filter((q) => !q.completed && q.progress / q.target >= 0.6).length);
        const TIER_COLORS: Record<string,string> = { starter: "#98FB98", daily: "#87CEEB", weekly: "#FFD700", monthly: "#D4A5FF", season: "#FF69B4", legendary: "#FF8A80" };
        const top = quests
          .filter((q) => !q.completed && q.progress > 0)
          .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
          .slice(0, 3)
          .map((q) => ({ id: q.id, title: q.title, icon: q.icon, progress: q.progress, target: q.target, color: TIER_COLORS[q.quest_tier] || "#FFD700" }));
        setTopQuests(top);
      }
      if (typeof d?.streak === "number") setLoginStreak(d.streak);
    } catch { trackError("muse_quest_refresh_failed"); }
  }, [apiFetch, setClaimableQuests, setLoginStreak, setNearQuests, setTopQuests]);

  // Quest tracking — call after successful actions. Batches multiple keys into
  // one request; silent unless a quest is newly completed or the user levels up
  // (one subtle toast each, never stacked).
  const trackQuest = useCallback(async (...actionKeys: string[]) => {
    if (!actionKeys.length) return;
    try {
      const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-quest", action_keys: actionKeys }) });
      const data = await res.json();
      if (!data?.success || !Array.isArray(data.results)) return;
      const completed = data.results.find((r: { newlyCompleted?: boolean; leveledUp?: boolean; action_key?: string; quest?: { icon?: string; title?: string } }) => r.newlyCompleted);
      if (completed) showToast(`${completed.quest?.icon || "⭐"} Quest complete: ${completed.quest?.title || completed.action_key}`);
      else {
        const leveled = data.results.find((r: { leveledUp?: boolean }) => r.leveledUp);
        if (leveled) showToast("🎉 Level up! Keep completing quests for rewards");
      }
      if (completed) setClaimableQuests(n => n + 1);
    } catch { trackError("muse_safety_preference_refresh_failed"); }
  }, [apiFetch, setClaimableQuests, showToast]);

  // Per-page tutorials: each major screen gets its own small lightbox the
  // first time this browser ever opens it (tracked one localStorage flag
  // per screen, muse_tour_seen_<screen>, same safeGetItem/safeSetItem
  // pattern as the old single muse_feature_tour_seen flag it replaces).
  // Only one page tour is ever open at once, tracked here rather than as a
  // showX boolean per screen.
  const maybeShowPageTour = useCallback((id: TourScreenId) => {
    if (activePageTour) return;
    if (pageTourShownRef.current.has(id)) return;
    // Same defensive pattern the old trigger used with showDailyLogin —
    // never stack a page tour on top of another full-screen modal.
    if (showDailyLogin || showAgeVerification || showAgeGate || showQuests || showStories || showHamburger) return;
    // Check localStorage FIRST — if this screen's tour has already been dismissed
    // in any prior session, don't show it again. (Previously the localStorage
    // read happened after adding to the ref, which was fine, but the early ref
    // add also meant a dismissed tour would be re-added to the ref set and
    // then immediately discarded — harmless but confusing; cleaner to gate
    // the localStorage check before any ref mutation.)
    let seen = "";
    try { seen = safeGetItem(tourSeenKey(id)) || ""; } catch { console.debug("[muse] tour state could not be read"); }
    if (seen) return;
    pageTourShownRef.current.add(id);
    setActivePageTour(id);
  }, [activePageTour, showDailyLogin, showAgeVerification, showAgeGate, showQuests, showStories, showHamburger]);

  const flash = useCallback((color: string) => { setScreenFlash(color); setTimeout(() => setScreenFlash(null), 300); }, [setScreenFlash]);

  // Back-navigation history: showScreen pushes the screen we're leaving so a
  // back button can return to the ACTUAL previous page (e.g. Analytics → back
  // → Profile, not Discover). goBack pops the stack; falls back to discover.
  const showScreen = useCallback((s: Screen) => {
    setScreen(prev => {
      if (prev !== s) {
        screenHistoryRef.current.push(prev);
        if (screenHistoryRef.current.length > 50) screenHistoryRef.current.shift();
      }
      return s;
    });
    analytics.screenView(s);
    try { window.scrollTo({ top: 0, behavior: "instant" }); } catch { console.debug("[muse] screen scroll reset failed"); }
  }, []);
  const goBack = useCallback(() => {
    const prev = screenHistoryRef.current.pop();
    const dest = prev && prev !== "auth" ? prev : "discover";
    setScreen(dest);
    analytics.screenView(dest);
    try { window.scrollTo({ top: 0, behavior: "instant" }); } catch { console.debug("[muse] screen scroll reset failed"); }
  }, []);

  const openHamburger = useCallback(() => { setHamburgerScreen(""); setShowHamburger(true); }, [setShowHamburger]);

  const closeUpsell = useCallback(() => setUpsell(null), []);

  const toggleSocial = useCallback((key: string) => {
    const currentlyConnected = obConnectedSocials[key];
    if (currentlyConnected) {
      // Disconnect — the endpoint reads provider from the query string (not
      // a JSON body) and only exports a GET handler, so this has to match
      // that shape rather than POSTing a body.
      apiFetch(`/api/muse/social?provider=${key}&action=disconnect`).then(() => {
        setObConnectedSocials(prev => ({ ...prev, [key]: false }));
        showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} disconnected`);
      }).catch(() => showToast("Failed to disconnect"));
    } else {
      // Connect - the endpoint requires an auth bearer header to identify
      // the caller, which a raw window.location.href navigation can't
      // send. Fetch it (authenticated) for the provider's real OAuth URL,
      // then navigate the browser there ourselves.
      apiFetch(`/api/muse/social?provider=${key}&action=auth`)
        .then(r => r.json())
        .then(d => { if (d.authUrl) window.location.href = d.authUrl; else showToast(d.error || `Couldn't connect ${key}`); })
        .catch(() => showToast(`Couldn't connect ${key}`));
    }
  }, [apiFetch, obConnectedSocials, setObConnectedSocials, showToast]);

  const dismissVerificationBanner = () => {
    setVerificationBannerClosing(true);
    setTimeout(() => {
      setVerificationBannerDismissed(true);
      setVerificationBannerClosing(false);
      try { safeSetItem("muse_verify_banner_dismissed", "1"); } catch { /* best-effort */ }
    }, 320);
  };

  return {
    setViewProfile,
    handleImgError,
    toggleObMulti,
    handleQuestsChange,
    trackQuest,
    maybeShowPageTour,
    flash,
    showScreen,
    goBack,
    openHamburger,
    closeUpsell,
    toggleSocial,
    dismissVerificationBanner,
    activePageTour,
    setActivePageTour,
    verificationBannerClosing,
  };
}
