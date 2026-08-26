"use client";

import { useState, useEffect } from "react";
import { trackError } from "@/lib/errorTracker";
import { normalizeSession } from "./normalizers";

export type UseSessionDataArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
};

export function useSessionData({ authFetch, profileId }: UseSessionDataArgs) {
  const [myBookings, setMyBookings] = useState<{ asBooker: any[]; asHost: any[] }>({ asBooker: [], asHost: [] });
  const [liveSessions, setLiveSessions] = useState<any[] | null>(null);

  // ═══ BOOKINGS: fetch real bookings (booker + host) ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=bookings")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.asBooker) setMyBookings({ asBooker: d.asBooker || [], asHost: d.asHost || [] }); })
      .catch((err) => { trackError("fetch_bookings", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  // ═══ SESSIONS: fetch real sessions from API ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=sessions")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.sessions) setLiveSessions(d.sessions.map(normalizeSession)); })
      .catch((err) => { trackError("fetch_sessions", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  return {
    myBookings, setMyBookings,
    liveSessions, setLiveSessions,
  };
}
