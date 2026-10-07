"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { Quest } from "../page-models";

/**
 * Quest progress / daily-login tracking: the authed-bootstrap login-quest
 * effect (login streak, weekly pips, claimable count). `questBootRef` is
 * used nowhere else. This originally also carried a second, separate effect
 * that recomputed the weekly pips from a client-local `muse_login_days`
 * localStorage array; that effect is gone (see the 2026-10-07 fix note
 * below) now that the pips are derived inline from the server streak number
 * the first effect already fetches.
 *
 * Bug fix (2026-10-07): the weekly pips used to be derived from a purely
 * client-local `muse_login_days` localStorage array, tracked independently
 * of `loginStreak` (which comes from the server, `muse_profiles.login_streak`
 * via `bumpLoginStreak`). That meant the two could silently disagree —
 * clearing site data, switching browsers/devices, or just being a returning
 * user with an empty localStorage would show a real multi-day streak number
 * next to a reset-to-zero row of pips. `muse_profiles` doesn't store a
 * per-day login history to read back as the honest fix, but it doesn't need
 * to: `login_streak` is already *defined* as a consecutive run of calendar
 * days ending today (see `bumpLoginStreak` in `questEngine.ts` — it resets
 * to 1 on any gap), so the last `min(streak, 7)` of the 7 displayed days
 * must have been hits and the rest must not have been, with no additional
 * data required. `deriveWeekFromStreak` below is that derivation; the pips
 * are now wired to the same server number the streak count already uses
 * instead of a second, independently-maintained local record.
 */
export function deriveWeekFromStreak(streak: number): boolean[] {
  const hits = Math.max(0, Math.min(streak, 7));
  const week = new Array(7).fill(false);
  // index 6 = today, 5 = yesterday, ... — the most recent `hits` days are on.
  for (let i = 0; i < hits; i++) week[6 - i] = true;
  return week;
}
export type UseQuestTrackingArgs = {
  bootstrapped: boolean;
  authUser: unknown;
  trackQuest: (...actionKeys: string[]) => void;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  setClaimableQuests: Dispatch<SetStateAction<number>>;
  setLoginStreak: Dispatch<SetStateAction<number>>;
  setShowDailyLogin: Dispatch<SetStateAction<boolean>>;
  setWeeklyLogins: Dispatch<SetStateAction<boolean[]>>;
  safeGetItem: (key: string) => string | null;
  safeSetItem: (key: string, value: string) => boolean;
};

export function useQuestTracking({
  bootstrapped,
  authUser,
  trackQuest,
  apiFetch,
  setClaimableQuests,
  setLoginStreak,
  setShowDailyLogin,
  setWeeklyLogins,
  safeGetItem,
  safeSetItem,
}: UseQuestTrackingArgs) {
  // Login quests + claimables badge — runs once authed+bootstrapped. Must live
  // AFTER trackQuest's declaration. Login counts once per calendar day so
  // daily/streak quests stay accurate across refreshes.
  const questBootRef = useRef(false);
  useEffect(() => {
    if (!bootstrapped || !authUser || questBootRef.current) return;
    questBootRef.current = true;
    const today = new Date().toISOString().slice(0, 10);
    let lastLoginDay = "";
    try { lastLoginDay = safeGetItem("muse_quest_login_day") || ""; } catch { console.debug("[muse] quest login state could not be read"); }
    if (lastLoginDay !== today) {
      try { safeSetItem("muse_quest_login_day", today); } catch { console.debug("[muse] quest login state could not be saved"); }
      trackQuest("login", "login_streak");
      setTimeout(() => setShowDailyLogin(true), 800);
    }
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-quests" }) })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d?.quests)) setClaimableQuests((d.quests as Quest[]).filter((q) => q.completed && !q.claimed).length);
        // Bug fix (live-verified): this boot-time fetch used to read only
        // `quests` from the response, leaving `loginStreak` at its initial 0
        // until the user happened to open the Quests panel (the only other
        // place that reads `d.streak`, see handleQuestsChange above). That
        // made the "Welcome back!" streak popup — which fires automatically
        // right below this block — always show "Start Your Streak" even for
        // an account with a real multi-day streak, while the day-checkmarks
        // next to it could already show several days filled in. Now this
        // fetch keeps `loginStreak` in sync with the server the same way it
        // already does, AND (see `deriveWeekFromStreak` above) derives the
        // weekly pips from that same server number instead of a separate,
        // independently-maintained local record — so the two can no longer
        // disagree with each other.
        if (typeof d?.streak === "number") {
          setLoginStreak(d.streak);
          setWeeklyLogins(deriveWeekFromStreak(d.streak));
        }
      })
      .catch(() => {});
  }, [bootstrapped, authUser, trackQuest, apiFetch, setClaimableQuests, setLoginStreak, setShowDailyLogin, setWeeklyLogins]);
}
