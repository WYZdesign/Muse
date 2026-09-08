"use client";

import { useState, useEffect } from "react";
import { trackError } from "@/lib/errorTracker";
import { normalizeProfile } from "./normalizers";
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

  // ═══ DISCOVER: live-ranked profiles from the server (match %, boosted,
  // complementary-side) so discovery runs on real rows + the buyer-facing
  // trust signal, not demo data. discover-ranked is a GET type in get.ts and
  // returns { profiles: [{ ...profile, matchScore, boosted, sideMatches }] }.
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=discover-ranked")
      .then(r => r.json())
      .then(d => {
        if (cancelled || !Array.isArray(d.profiles)) return;
        const enriched = d.profiles.map((p: any) => ({
          ...normalizeProfile(p),
          matchScore: Number(p.matchScore || 0),
          boosted: !!p.boosted,
          sideMatches: !!p.sideMatches,
          verified: !!p.verified,
          boost_expires_at: p.boost_expires_at || null,
        }));
        setLiveProfiles(enriched);
      })
      .catch((err) => { trackError("fetch_discover_ranked", { err: String(err) }); });
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
            // t.avatar is already stripped server-side (get.ts's "matches"
            // handler) when nsfw && the viewer isn't age-verified — nsfw is
            // carried through so the UI can show a locked/blurred state
            // instead of a broken image when that happens.
            return { id: t.id, name: t.name || "Unknown", img: t.avatar || "", nsfw: !!t.nsfw, type: t.type || "", bio: t.bio || "", location: t.loc || "", booked: false, online, messages: [] } as Match;
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
