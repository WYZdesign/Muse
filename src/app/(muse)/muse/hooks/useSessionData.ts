"use client";

import { useState, useEffect } from "react";
import { trackError } from "@/lib/errorTracker";
import { normalizeSession } from "./normalizers";
import type { SessionListing } from "../components/types";

export type UseSessionDataArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
};

export function useSessionData({ authFetch, profileId }: UseSessionDataArgs) {
  const [myBookings, setMyBookings] = useState<{ asBooker: any[]; asHost: any[] }>({ asBooker: [], asHost: [] });
  const [liveSessions, setLiveSessions] = useState<SessionListing[] | null>(null);
  const [bookingReminders, setBookingReminders] = useState<any[]>([]);

  // ═══ BOOKINGS: fetch real bookings (booker + host) ═══
  useEffect(() => {
    if (!profileId) return;
    // Populated demo bookings so the Bookings and Requests tabs never show
    // "No bookings yet" (owner: demo mode must look published).
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") {
      const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
      const av = (id: string) => `https://images.unsplash.com/${id}?w=200`;
      setMyBookings({
        asBooker: [
          { bookingId: "db-1", status: "confirmed", host_id: { name: "Maya Chen", avatar: av("photo-1494790108377-be9c29b29330") }, session_id: { title: "Golden Hour Portrait Session", rate: "$75/hr" }, sessionDate: day(4), sessionTime: "5:30 PM", sessionLocation: "Zilker Park, Austin" },
          { bookingId: "db-2", status: "pending", host_id: { name: "Sam Taylor", avatar: av("photo-1500648767791-00dcc994a43e") }, session_id: { title: "Original Score Session", rate: "$90/hr" }, sessionDate: day(9), sessionTime: "11:00 AM", sessionLocation: "Remote" },
          { bookingId: "db-3", status: "completed", host_id: { name: "Riley Patel", avatar: av("photo-1534528741775-53994a69daeb") }, session_id: { title: "Brand Identity Intensive", rate: "$85/hr" }, sessionDate: day(-12), sessionTime: "10:00 AM", sessionLocation: "Chicago, IL" },
        ],
        asHost: [
          { bookingId: "dh-1", status: "confirmed", booker_id: { name: "Andre Silva", avatar: av("photo-1507003211169-0a1dd7228f2d") }, session_id: { title: "Editorial Test Shoot", rate: "$75/hr" }, sessionDate: day(6), sessionTime: "1:00 PM", sessionLocation: "Studio 4, Austin" },
          { bookingId: "dh-2", status: "pending", booker_id: { name: "Lena Ortiz", avatar: av("photo-1438761681033-6461ffad8d80") }, session_id: { title: "Editorial Test Shoot", rate: "$75/hr" }, sessionDate: day(15), sessionTime: "3:00 PM" },
        ],
      });
      return;
    }
    let cancelled = false;
    authFetch("/api/muse?type=bookings")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.asBooker) setMyBookings({ asBooker: d.asBooker || [], asHost: d.asHost || [] }); })
      .catch((err) => { trackError("fetch_bookings", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  // ═══ BOOKING REMINDERS: upcoming shoots in the next 7 days ═══
  useEffect(() => {
    if (!profileId) return;
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") {
      const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
      setBookingReminders([
        { bookingId: "db-1", isHost: false, sessionTitle: "Golden Hour Portrait Session", sessionDate: day(4), sessionTime: "5:30 PM", sessionLocation: "Zilker Park, Austin" },
        { bookingId: "dh-1", isHost: true, sessionTitle: "Editorial Test Shoot", sessionDate: day(6), sessionTime: "1:00 PM", sessionLocation: "Studio 4, Austin" },
      ]);
      return;
    }
    let cancelled = false;
    authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "booking-reminders" }) })
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.reminders)) setBookingReminders(d.reminders); })
      .catch(() => { /* non-fatal */ });
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
    bookingReminders, setBookingReminders,
  };
}
