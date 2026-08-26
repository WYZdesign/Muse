"use client";

import { useState, useEffect } from "react";
import { trackError } from "@/lib/errorTracker";
import { normalizeCommunity, normalizeEvent } from "./normalizers";

export type UseCommunityDataArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
};

export function useCommunityData({ authFetch, profileId }: UseCommunityDataArgs) {
  const [liveCommunities, setLiveCommunities] = useState<any[] | null>(null);
  const [liveEvents, setLiveEvents] = useState<any[] | null>(null);
  const [rsvpdEvents, setRsvpdEvents] = useState<number[]>([]);

  // ═══ EVENTS: fetch real events from API ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=events")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.events) setLiveEvents(d.events.map(normalizeEvent)); })
      .catch((err) => { trackError("fetch_events", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  // ═══ RSVPs: fetch user's event RSVPs ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=rsvps")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.rsvps) setRsvpdEvents(d.rsvps); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profileId]);

  // ═══ COMMUNITIES: fetch real communities from API ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=communities")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.communities) setLiveCommunities(d.communities.map(normalizeCommunity)); })
      .catch((err) => { trackError("fetch_communities", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  return {
    liveCommunities, setLiveCommunities,
    liveEvents, setLiveEvents,
    rsvpdEvents, setRsvpdEvents,
  };
}
