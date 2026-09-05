"use client";
import { useState } from "react";

/**
 * Quests/login-streak state, extracted from page.tsx. Owns the counts and
 * data QuestPanel/MenuModal/ProfileScreen/SettingsScreen/StreakWidget read
 * (claimable/near/top quests, login streak, weekly login pips). Same shape
 * as useChatState/useBriefsState — every name in is the same name out, so
 * no call site elsewhere in page.tsx needed to change.
 */
export function useQuestsState() {
  const [claimableQuests, setClaimableQuests] = useState(0);
  const [nearQuests, setNearQuests] = useState(0);
  const [topQuests, setTopQuests] = useState<{ id: string; title: string; icon: string; progress: number; target: number; color: string }[]>([]);
  const [loginStreak, setLoginStreak] = useState(0);
  const [weeklyLogins, setWeeklyLogins] = useState<boolean[]>([false, false, false, false, false, false, false]);

  return {
    claimableQuests, setClaimableQuests,
    nearQuests, setNearQuests,
    topQuests, setTopQuests,
    loginStreak, setLoginStreak,
    weeklyLogins, setWeeklyLogins,
  };
}
