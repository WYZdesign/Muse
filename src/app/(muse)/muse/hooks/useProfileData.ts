"use client";

import { useState, useEffect } from "react";

export type UseProfileDataArgs = {
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
};

export function useProfileData({ apiFetch, authFetch, profileId }: UseProfileDataArgs) {
  const [myStats, setMyStats] = useState<{ views: number; likes: number } | null>(null);
  const [safetyCheckins, setSafetyCheckins] = useState<any[]>([]);
  const [safetyProfile, setSafetyProfile] = useState<any>(null);
  const [promptBankData, setPromptBankData] = useState<any[]>([]);
  const [promptResponses, setPromptResponses] = useState<any[]>([]);

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
    safetyProfile, setSafetyProfile,
    promptBankData, setPromptBankData,
    promptResponses, setPromptResponses,
  };
}
