"use client";

import { useState, useEffect, useCallback } from "react";
import { trackError } from "@/lib/errorTracker";
import type { Match, Profile } from "../components/types";

export type UseDiscoveryDataArgs = {
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
};

export function useDiscoveryData({ apiFetch, authFetch, profileId }: UseDiscoveryDataArgs) {
  const [liveProfiles, setLiveProfiles] = useState<any[] | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [likedBy, setLikedBy] = useState<Profile[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [matchStreak, setMatchStreak] = useState(0);

  // ═══ DISCOVER: fetch real profiles from API ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=profiles")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.profiles) setLiveProfiles(d.profiles); })
      .catch((err) => { trackError("fetch_profiles", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  // ═══ MATCHES: fetch real matches (replaces demo fallback) ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=matches")
      .then(r => r.json())
      .then(d => {
        if (cancelled || !Array.isArray(d.matches) || !d.matches.length) return;
        const real: Match[] = d.matches
          .map((m: any) => {
            const t = m.target_id || {};
            if (!t.id) return null;
            const online = !!t.last_seen_at && (Date.now() - new Date(t.last_seen_at).getTime()) < 5 * 60 * 1000;
            return { id: t.id, name: t.name || "Unknown", img: t.avatar || "", type: t.type || "", bio: t.bio || "", location: t.loc || "", booked: false, online, messages: [] } as Match;
          })
          .filter((m: any): m is Match => m !== null);
        if (real.length) setMatches(real);
      })
      .catch((err) => { trackError("fetch_matches", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  // ═══ BLOCKS: fetch real blocked-user ids ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "get-blocks" }) })
      .then(r => r.json())
      .then(d => {
        if (cancelled || !Array.isArray(d.blocked)) return;
        setBlockedUsers(prev => Array.from(new Set([...prev, ...d.blocked])));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profileId]);

  return {
    liveProfiles, setLiveProfiles,
    matches, setMatches,
    likedBy, setLikedBy,
    blockedUsers, setBlockedUsers,
    matchStreak, setMatchStreak,
  };
}
