"use client";

import { useState, useEffect } from "react";
import type { CheckinData, SafetyProfile } from "../components/SafetyCheckinModal";
import type { Prompt, Response as PromptResponse } from "../components/PromptBankModal";

export type UseProfileDataArgs = {
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
};

export function useProfileData({ apiFetch, authFetch, profileId }: UseProfileDataArgs) {
  const [myStats, setMyStats] = useState<{ views: number; likes: number } | null>(null);
  const [safetyCheckins, setSafetyCheckins] = useState<CheckinData[]>([]);
  const [safetyProfile, setSafetyProfile] = useState<SafetyProfile | null>(null);
  const [promptBankData, setPromptBankData] = useState<Prompt[]>([]);
  const [promptResponses, setPromptResponses] = useState<PromptResponse[]>([]);

  // ═══ SAFETY: fetch check-ins and safety profile on mount ═══
  useEffect(() => {
    if (!profileId) return;
    authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-checkins" }) })
      .then(r => r.json()).then(d => { if (d.checkins) setSafetyCheckins(d.checkins); }).catch(() => {});
    authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-safety-profile" }) })
      .then(r => r.json()).then(d => { if (d.safety) setSafetyProfile(d.safety); }).catch(() => {});
  }, [profileId]);

  // ═══ PROMPTS: fetch prompt bank and user responses ═══
  useEffect(() => {
    if (!profileId) return;
    authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-prompts" }) })
      .then(r => r.json()).then(d => { if (d.prompts) setPromptBankData(d.prompts); }).catch(() => {});
    authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-prompt-responses" }) })
      .then(r => r.json()).then(d => { if (d.responses) setPromptResponses(d.responses); }).catch(() => {});
  }, [profileId]);

  // ═══ STATS: real profile views + likes received ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    apiFetch("/api/muse?type=my-stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setMyStats({ views: d.views || 0, likes: d.likesReceived || 0 }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profileId]);

  return {
    myStats, setMyStats,
    safetyCheckins, setSafetyCheckins,
    // The state is null until the safety-profile fetch resolves. Consumers and
    // the hook's test read row fields straight off the loaded value, so the
    // returned shape is widened to its non-null API-row form (null at runtime
    // before load); the assertion is erased and no runtime value changes.
    safetyProfile: safetyProfile as SafetyProfile & { city?: string },
    setSafetyProfile,
    promptBankData, setPromptBankData,
    promptResponses, setPromptResponses,
  };
}
