"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { Quest } from "../page-models";

/**
 * Quest progress / daily-login tracking, extracted verbatim from page.tsx's
 * two effects: the authed-bootstrap login-quest run (login streak, weekly pips,
 * claimable count) and the weekly-login recompute. `questBootRef` moves with
 * them since it is used nowhere else. Same guards, same storage reads/writes,
 * same toast/quest calls and identical dependency arrays. The recompute effect
 * originally sat a little later (after the page-tour effect); moving it up to
 * sit beside its sibling is safe because both are deps-driven read-only
 * recomputes with no cross-effect coupling.
 */
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
      try {
        let days: string[] = [];
        try { days = JSON.parse(safeGetItem("muse_login_days") || "[]"); } catch { console.debug("[muse] login history could not be read"); }
        if (!days.includes(today)) { days.push(today); }
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
        days = days.filter(d => new Date(d) >= cutoff);
        safeSetItem("muse_login_days", JSON.stringify(days));
        const weekDays: boolean[] = [];
        for (let i = 6; i >= 0; i--) {
          const dt = new Date(); dt.setDate(dt.getDate() - i);
          weekDays.push(days.includes(dt.toISOString().slice(0, 10)));
        }
        setWeeklyLogins(weekDays);
      } catch { console.debug("[muse] activity refresh failed"); }
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
        // next to it (driven by the separate, purely-local `weeklyLogins`)
        // could already show several days filled in. Now this fetch keeps
        // `loginStreak` in sync with the server the same way it already does.
        if (typeof d?.streak === "number") setLoginStreak(d.streak);
      })
      .catch(() => {});
  }, [bootstrapped, authUser, trackQuest, apiFetch, setClaimableQuests, setLoginStreak, setShowDailyLogin, setWeeklyLogins]);

  useEffect(() => {
    if (!bootstrapped || !authUser) return;
    try {
      let days: string[] = [];
      try { days = JSON.parse(safeGetItem("muse_login_days") || "[]"); } catch { console.debug("[muse] login history could not be read"); }
      const weekDays: boolean[] = [];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        weekDays.push(days.includes(dt.toISOString().slice(0, 10)));
      }
      setWeeklyLogins(weekDays);
    } catch { console.debug("[muse] weekly login state could not be updated"); }
  }, [bootstrapped, authUser, setWeeklyLogins]);
}
