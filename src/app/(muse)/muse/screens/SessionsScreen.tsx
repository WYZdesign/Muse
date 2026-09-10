"use client";

import React, { memo, useState, useEffect } from "react";
import Image from "next/image";
import { FiArrowLeft, FiBookmark, FiSearch, FiCompass, FiCalendar, FiInbox, FiEye } from "react-icons/fi";
import Nav from "../components/Nav";
import { BADGE_COLORS } from "../components/badgeColors";
import { EmptyState } from "../components/EmptyState";
import { sessionTier } from "../components/sessionTiers";
import { matchesSessionSearch } from "../components/searchMatch";
import { BadgeInfoModal, type BadgeInfo } from "../components/badgeInfo";

import type { Screen, Match, SessionListing } from "../components/types";
import { SESSIONS } from "../components/types";
import HScroll from "../components/HScroll";
import { STRINGS } from "@/lib/strings";

export interface SessionsScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  sessTab: "sessions" | "bookings" | "requests";
  setSessTab: (t: "sessions" | "bookings" | "requests") => void;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  openChat: (m: any) => void;
  setChatTarget: (m: any) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  authFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  uid: () => any;
  currentUser: any;
  setShowAgeVerification: (v: boolean) => void;
  setShowReport?: (v: boolean) => void;
  setReportTarget?: (t: { id: number | string; type: string; name: string }) => void;
  openHamburger?: () => void;
  unreadNotificationCount?: number;
  demo?: boolean;
  liveSessions?: SessionListing[];
  myBookings?: { asBooker: any[]; asHost: any[] };
  setMyBookings?: React.Dispatch<React.SetStateAction<{ asBooker: any[]; asHost: any[] }>>;
  bookingReminders?: any[];
  setDisclosureTarget?: (t: any) => void;
  setDisclosureBookingId?: (id: string) => void;
  setShowDisclosureModal?: (v: boolean) => void;
  setViewProfile?: (p: any) => void;
  savedSessionIds?: (string | number)[];
  setSavedSessionIds?: React.Dispatch<React.SetStateAction<(string | number)[]>>;
}

// Booking/payment confirmation transparency (competitive-audit finding —
// Calendly+Stripe / Airbnb both show both sides a plain-language payment
// state, not just a booking state). muse_booking_payments.status is already
// fetched into b.payment_status (see get.ts's "bookings" handler) but was
// never shown anywhere — a booker had no visual confirmation their payment
// actually went through, and a host had no way to tell a booking was paid
// vs. still awaiting payment. Read-only display of data that already
// exists; does not touch the escrow/payment-capture logic itself.
// Status values confirmed via sql/MUSE_BOOKING_PAYMENT_HELD_STATUS_20260831.sql
// and the webhook/connect-route write sites: pending | held | succeeded | failed | refunded.
function paymentStatusPill(payment_status: string | null | undefined): { label: string; colors: typeof BADGE_COLORS[keyof typeof BADGE_COLORS] } | null {
  switch (payment_status) {
    case "held": return { label: "Payment held", colors: BADGE_COLORS.blue };
    case "succeeded": return { label: "Paid", colors: BADGE_COLORS.green };
    case "refunded": return { label: "Refunded", colors: BADGE_COLORS.muted };
    case "failed": return { label: "Payment failed", colors: BADGE_COLORS.red };
    default: return null; // "pending" / not yet attempted — nothing to confirm yet, don't imply otherwise
  }
}

// Tier threshold logic lives in components/sessionTiers.ts (plain module,
// no JSX) so it can be unit-tested without pulling React/next/image in.

export const SessionsScreen = memo(function SessionsScreen({
  screen,
  sessTab,
  setSessTab,
  matches,
  openChat,
  setChatTarget,
  showScreen,
  showToast,
  handleImgError,
  setShowAgeVerification,
  setShowReport = () => {},
  setReportTarget = () => {},
  uid,
  currentUser,
  apiFetch,
  authFetch,
  openHamburger,
  unreadNotificationCount,
  demo = false,
  setMatches = () => {},
  liveSessions = [],
  myBookings = { asBooker: [], asHost: [] },
  setMyBookings = () => {},
  bookingReminders = [],
  setDisclosureTarget = () => {},
  setDisclosureBookingId = () => {},
  setShowDisclosureModal = () => {},
  setViewProfile = () => {},
  savedSessionIds = [],
  setSavedSessionIds = () => {},
}: SessionsScreenProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
  const [newSession, setNewSession] = useState({ title: "", description: "", type: "Photoshoot", rate: "", duration: "60 min", date: "", location: "" });
  const [creating, setCreating] = useState(false);

  // Host payout nudge — if the host has completed bookings but isn't connected
  // to Stripe yet, surface a "connect to get paid" CTA (3d, MUSE_GAPS).
  const [payout, setPayout] = useState<{ needsConnect: boolean; unpaidEarningsCents: number; chargesEnabled: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/muse?type=payout-readiness")
      .then(r => r.json())
      .then(d => { if (!cancelled && d && typeof d.needsConnect === "boolean") setPayout(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const connectStripe = async () => {
    try {
      const r = await authFetch("/api/muse/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-account" }) });
      const j = await r.json();
      if (j.url) { window.location.href = j.url; }
      else { showToast(j.error || "Couldn't start Stripe onboarding"); }
    } catch { showToast("Couldn't start Stripe onboarding"); }
  };

  const requestRefund = async (bookingId: string) => {
    try {
      const r = await authFetch("/api/muse/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request-refund", bookingId, reason: "Requested by client" }) });
      const j = await r.json();
      if (r.ok) { showToast("Refund request filed — we'll review it"); }
      else { showToast(j.error || "Couldn't file request"); }
    } catch { showToast("Couldn't file request"); }
  };
  const submitSession = async () => {
    if (!newSession.title.trim()) { showToast("Title is required"); return; }
    setCreating(true);
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-session", ...newSession }) });
      if (!r.ok) throw new Error("failed");
      showToast("Session listed — you're now bookable");
      setShowCreate(false);
      setNewSession({ title: "", description: "", type: "Photoshoot", rate: "", duration: "60 min", date: "", location: "" });
    } catch {
      showToast("Failed to list session");
    } finally {
      setCreating(false);
    }
  };

  // Save/bookmark toggle — same client+server pattern as Briefs' savedBriefs
  // (id kept in local state and mirrored to muse_profiles.preferences via
  // save-preferences, so it persists across devices/sessions).
  const toggleSaveSession = (sessionId: string | number) => {
    const isSaved = savedSessionIds.includes(sessionId);
    const next = isSaved ? savedSessionIds.filter(x => x !== sessionId) : [...savedSessionIds, sessionId];
    setSavedSessionIds(next);
    showToast(isSaved ? "Unsaved" : "Saved!");
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { savedSessionIds: next } }) }).catch(() => showToast(isSaved ? "Couldn't unsave — try again" : "Couldn't save — try again"));
  };

  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSending, setReviewSending] = useState(false);

  const refreshBookings = async () => {
    try {
      const r = await authFetch("/api/muse?type=bookings");
      const j = await r.json();
      if (j.asBooker) setMyBookings({ asBooker: j.asBooker || [], asHost: j.asHost || [] });
    } catch { /* non-fatal */ }
  };

  const respondBooking = async (bookingId: string, response: "accept" | "decline") => {
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "respond-booking", bookingId, response }) });
      if (!r.ok) throw new Error("failed");
      showToast(response === "accept" ? "Booking accepted — pre-shoot check-in sent" : "Booking declined");
      refreshBookings();
    } catch { showToast("Failed to respond"); }
  };

  const completeBooking = async (bookingId: string) => {
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete-booking", bookingId }) });
      if (!r.ok) throw new Error("failed");
      showToast("Shoot marked complete");
      refreshBookings();
    } catch { showToast("Failed to complete"); }
  };

  // Styled confirmation modal (replaces the one native confirm() in the app):
  // open it on cancel intent, run the request only after the user confirms.
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const doCancel = async (bookingId: string) => {
    setCancelBusy(true);
    setCancelTarget(null);
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel-booking", bookingId }) });
      if (!r.ok) throw new Error("failed");
      showToast("Booking cancelled");
      refreshBookings();
    } catch { showToast("Failed to cancel"); }
    setCancelBusy(false);
  };

  const payBooking = async (booking: any) => {
    const host = booking.host_id;
    const session = booking.session_id;
    if (!host?.id) { showToast("Host unavailable"); return; }
    try {
      // Amount is derived server-side from the session's declared rate —
      // never send a client-computed amount.
      const r = await authFetch("/api/muse/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-booking-checkout", bookingId: booking.id, description: `Booking: ${session?.title || "Muse session"}` }) });
      const j = await r.json();
      if (j.url) { window.location.href = j.url; }
      else { showToast(j.error || "Payment unavailable"); }
    } catch { showToast("Failed to start payment"); }
  };

  // Same convergent finding as Collab's brief search (Thumbtack/TaskRabbit
  // free-text project search) applied to session listings — client-side
  // filter over the already-fetched liveSessions array, no backend change.
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");

  const submitReview = async () => {
    if (!reviewTarget) return;
    setReviewSending(true);
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit-review", bookingId: reviewTarget.id, rating: reviewRating, body: reviewBody }) });
      if (!r.ok) throw new Error("failed");
      showToast("Review submitted");
      setReviewTarget(null);
      setReviewBody("");
      setReviewRating(5);
      refreshBookings();
    } catch { showToast("Failed to submit review"); } finally { setReviewSending(false); }
  };
  return (
    <div className={"screen-el" + (screen === "sessions" ? " active" : "")} data-screen="sessions">
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div className="logo-link" style={{ fontSize: 37.5, backgroundImage: "linear-gradient(90deg,#F2CC8F,#E07A5F,#F4A261,#F2CC8F,#E07A5F,#F2CC8F)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", position: "relative", margin: 0, padding: 0, animation: "lavaFlow 7s ease-in-out infinite,logoShimmer 4s ease-in-out infinite" }}>Sessions</div>
        <div style={{ width: 42 }} />
      </div>
      <HScroll className="conn-tabs" gap={0} style={{ padding: "0 16px", justifyContent: "center" }}>
        {/* Small leading icon per tab (audit finding tu-2) — same treatment as
            Collab's category row, for the same glance-ability reason. */}
        {([["sessions", "Browse", FiCompass], ["bookings", "My Bookings", FiCalendar], ["requests", "Requests", FiInbox]] as const).map(([t, label, Icon]) => (
          <div key={t} className={"conn-tab" + (sessTab === t ? " active" : "")} role="tab" aria-selected={sessTab === t} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSessTab(t); } }} onClick={() => setSessTab(t)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon size={11} />{label}
          </div>
        ))}
      </HScroll>
      {sessTab === "sessions" && (
        <div style={{ margin: "0 16px 12px", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px 12px", animation: "fadeIn .2s ease" }}>
          <FiSearch size={14} color="var(--muted)" />
          <input className="inp" placeholder="Name, type, or skill..." value={sessionSearchQuery} onChange={e => setSessionSearchQuery(e.target.value)} autoFocus style={{ flex: 1, margin: 0, padding: "4px 0", border: "none", background: "transparent", fontSize: 13, color: "var(--text)" }} />
          {sessionSearchQuery && <button onClick={() => setSessionSearchQuery("")} aria-label="Clear search" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>}
        </div>
      )}
<div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
            {sessTab === "sessions" && (
              <>
                <button className="btn btn-gold" style={{ width: "100%", padding: "14px 0", fontSize: 13, fontWeight: 700, borderRadius: 12, marginTop: 4, marginBottom: 12 }} onClick={() => setShowCreate(true)}>+ List a Session</button>
                <div style={{ margin: "0 0 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Available Sessions</div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12, textAlign: "center" }}>Find a session, book it, and pay securely.</div>
            {(() => {
              const base = (liveSessions?.length ? liveSessions : (demo ? SESSIONS as SessionListing[] : []));
              const q = sessionSearchQuery.trim().toLowerCase();
              const list = q ? base.filter(s => matchesSessionSearch(s, sessionSearchQuery)) : base;
              if (q && list.length === 0) {
                return (
                  <EmptyState icon={<FiSearch size={44} />} title="No matches" sub={`Nothing found for "${sessionSearchQuery.trim()}"`}>
                    <button className="btn btn-outline" style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => setSessionSearchQuery("")}>Clear Search</button>
                  </EmptyState>
                );
              }
              return list.map(s => (
              <div key={s.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch", position: "relative" }}>
                <button aria-label="Report session" title="Report" onClick={() => { setReportTarget({ id: s.id, type: "session", name: s.name || "session" }); setShowReport(true); }} style={{ position: "absolute", top: 8, right: 8, zIndex: 2, width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 12, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</button>
                <div style={{ position: "relative", width: "25%", alignSelf: "stretch", minHeight: 120, flexShrink: 0 }}>
                  {s.img && (
                    <Image src={s.img} alt={s.name} fill sizes="25vw" style={{ objectFit: "cover" }} onError={handleImgError} />
                  )}
                </div>
                <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div className="conn-name" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {s.name}
                    {s.hostVerified && <span className="card-verified-mark" style={{ fontSize: 13, cursor: "pointer" }} title="Identity verified" role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: "Verified Host", desc: "Identity verified by Muse — we confirmed this host's government ID and credentials.", icon: "✓", color: "#FFD700" })} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setBadgeInfo({ name: "Verified Host", desc: "Identity verified by Muse — we confirmed this host's government ID and credentials.", icon: "✓", color: "#FFD700" }); } }}>✓</span>}
                    {(() => {
                      const tier = sessionTier(s);
                      if (!tier) return null;
                      return (
                        <span
                          role="button"
                          tabIndex={0}
                          title={`${tier.minSessions}+ completed sessions and a ${tier.minRating}+ average rating`}
                          onClick={() => setBadgeInfo({ name: tier.label, desc: tier.key === "elite" ? "Muse's top tier — 25+ completed sessions and a 4.8+ average rating, among the most trusted hosts on Muse." : tier.key === "top" ? "Top Rated — 10+ completed sessions and a 4.5+ average rating, a proven and reliable host." : "Rising Muse — 3+ completed sessions and a 4.0+ average rating, building a strong track record.", icon: tier.icon, color: tier.color })}
                          style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3, padding: "2px 7px", borderRadius: 20, background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color, textTransform: "uppercase", cursor: "pointer" }}
                        >{tier.icon} {tier.label}</span>
                      );
                    })()}
                  </div>
                  <div className="conn-meta" style={{ fontSize: 12 }}>{s.type} · {s.rate} · ★ {s.rating}</div>
                  {!!s.hostCompletedSessions && (
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.hostCompletedSessions} session{s.hostCompletedSessions === 1 ? "" : "s"} completed</div>
                  )}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {(s.skills || []).map((sk: string) => <span key={sk} className="conn-tag" role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: sk, desc: `A skill covered in this session — what you'll work on or learn.`, icon: "🛠", color: "#90caf9" })} style={{ fontSize: 10, padding: "3px 8px", cursor: "pointer" }}>{sk}</span>)}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      className="btn btn-gold"
                      style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 700, borderRadius: 12, whiteSpace: "nowrap" }}
                      onClick={async (e) => {
                        const btn = e.currentTarget;
                        if (btn.disabled) return;
                        btn.disabled = true;
                        try {
                          const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "book-session", sessionId: s.id }) });
                          if (r.status === 403) {
                            const d = await r.json().catch(() => ({}));
                            if (d.code === "VERIFICATION_REQUIRED") {
                              setShowAgeVerification(true);
                              showToast("Verify your identity to book paid sessions");
                              return;
                            }
                          }
                          if (!r.ok) throw new Error("failed");
                          showToast("Session request sent to " + s.name + "!");
                        } catch {
                          showToast("Failed to book session");
                        } finally {
                          setTimeout(() => { btn.disabled = false; }, 2000);
                        }
                      }}
                    >
                      {s.available ? "Book Session" : "Waitlist"}
                    </button>
                    <button style={{ flex: "0 0 44px", width: 44, height: 44, background: "transparent", border: "none", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }} aria-label="View Profile" title="View Profile" onClick={() => setViewProfile(s)}><FiEye size={18} /></button>
                    <button
                      style={{ flex: "0 0 44px", width: 44, height: 44, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: savedSessionIds.includes(s.id) ? "var(--gold)" : "var(--text2)" }}
                      onClick={() => toggleSaveSession(s.id)}
                      aria-label={savedSessionIds.includes(s.id) ? "Unsave session" : "Save session"}
                      title={savedSessionIds.includes(s.id) ? "Saved" : "Save"}
                    >
                      <FiBookmark size={18} fill={savedSessionIds.includes(s.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              </div>
              ));
            })()}
            <div style={{ height: 1, margin: "20px 0 8px", background: "linear-gradient(90deg, transparent, rgba(233,30,99,0.4), transparent)" }} />
            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 8 }}>Browse local studios in the LA area</div>
            <button className="btn ls-gradient" style={{ width: "100%", padding: "14px 0", fontSize: 13, fontWeight: 800, borderRadius: 12 }} onClick={() => showScreen("studios")}>✦ Browse LA Studios</button>
          </>
        )}
        {sessTab === "bookings" && (
          <div style={{ padding: "0 0 20px" }}>
            {/* Audit fix (2026-09-08): this heading just repeated the "My
                Bookings" tab label verbatim, right under it — the other two
                tabs (Browse -> "Available Sessions", Requests -> "Incoming
                Requests") both use a distinct, more descriptive heading
                instead of echoing the tab name. */}

            {/* Audit fix (2026-09-08): bookingReminders mixes both asBooker and
                asHost upcoming bookings (that's correct for a general reminder
                feed), but this widget sits directly above a list that's
                explicitly asBooker-only ("Your Booked Sessions") — showing
                the user's own hosting jobs here too made the two adjacent
                widgets disagree about what "upcoming" means on this tab.
                Scoped to booker-side only so they stay consistent. */}
            {bookingReminders.filter(rem => !rem.isHost).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 8 }}>☀️ Upcoming shoots</div>
                {bookingReminders.filter(rem => !rem.isHost).map(rem => (
                  <div key={rem.bookingId} className="conn-card" style={{ marginBottom: 8, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 20 }}>📅</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{rem.sessionTitle || "Shoot"}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                        {rem.sessionDate || "Date TBD"}{rem.sessionTime ? ` · ${rem.sessionTime}` : ""}{rem.sessionLocation ? ` · ${rem.sessionLocation}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {myBookings.asBooker.length === 0 && (
              <EmptyState icon="📅" title="No bookings yet" sub="Book a session from the Browse tab. Your bookings will show up here." style={{ padding: "24px 20px" }}>
                <button className="btn ls-gradient" style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => setSessTab("sessions")}>Browse Sessions</button>
              </EmptyState>
            )}
            {myBookings.asBooker.map(b => {
              const host = b.host_id || {};
              const sess = b.session_id || {};
              const label = b.status === "pending" ? "Awaiting host" : b.status === "confirmed" ? "Confirmed" : b.status === "completed" ? "Completed" : "Cancelled";
              const statusColors: Record<string, { bg: string; bd: string; c: string }> = {
                completed: BADGE_COLORS.green,
                confirmed: BADGE_COLORS.gold,
                cancelled: BADGE_COLORS.red,
                pending: BADGE_COLORS.muted,
              };
              const sc = statusColors[b.status] || BADGE_COLORS.muted;
              const pp = paymentStatusPill(b.payment_status);
              return (
                <div key={b.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch" }}>
                  <div style={{ position: "relative", width: "25%", alignSelf: "stretch", minHeight: 120, flexShrink: 0 }}>
                    {(host.avatar || sess.img) && (
                      <Image src={host.avatar || sess.img} alt={host.name || "Host"} fill sizes="25vw" style={{ objectFit: "cover" }} onError={handleImgError} />
                    )}
                  </div>
                  <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div className="conn-name" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                        {host.name || "Host"}
                        {host.verified && <span className="card-verified-mark" style={{ fontSize: 13, cursor: "pointer" }} title="Identity verified" role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: "Verified Host", desc: "Identity verified by Muse — we confirmed this host's government ID and credentials.", icon: "✓", color: "#FFD700" })}>✓</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        {pp && <span role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: pp.label, desc: pp.label === "Payment held" ? "Your payment is held in escrow securely until the session is completed." : pp.label === "Paid" ? "Payment completed successfully through secure checkout." : pp.label === "Refunded" ? "This payment was refunded to the client." : pp.label === "Payment failed" ? "The payment attempt failed — no money was taken." : "Payment confirmation state.", icon: "💳", color: pp.colors.c })} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: pp.colors.bg, color: pp.colors.c, border: `1px solid ${pp.colors.bd}`, whiteSpace: "nowrap", cursor: "pointer" }}>{pp.label}</span>}
                        <span role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: label, desc: label === "Awaiting host" ? "Waiting for the host to confirm your request." : label === "Confirmed" ? "The host has confirmed this booking." : label === "Completed" ? "This session has been completed." : label === "Cancelled" ? "This booking was cancelled." : "Current status of this booking.", icon: "📋", color: sc.c })} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: sc.bg, color: sc.c, border: `1px solid ${sc.bd}`, whiteSpace: "nowrap", cursor: "pointer" }}>{label}</span>
                      </div>
                    </div>
                    <div className="conn-meta" style={{ fontSize: 12 }}>{sess.title || "Session"} · {sess.rate || "Rate TBD"}</div>
                    {/* Audit fix (2026-09-08): these action buttons had padding:"10px 0" —
                        zero horizontal padding — while sharing a flex:1 row with 1-3
                        siblings and labels like "Complete", "Leave Review", "Confirm
                        Cancel". With no side padding the button's own border/background
                        edge sat flush against the text, reading as cramped/broken rather
                        than a normal pill button. Added 6px of horizontal breathing room
                        (kept small so multi-button rows still fit on narrow screens). */}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {b.status === "confirmed" && b.payment_status !== "held" && b.payment_status !== "succeeded" && (
                        <button className="btn btn-gold" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 700, borderRadius: 12 }} onClick={() => payBooking(b)}>Pay</button>
                      )}
                      {b.status === "confirmed" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => completeBooking(b.id)}>Complete</button>
                      )}
                      {(b.status === "pending" || b.status === "confirmed") && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 600, borderRadius: 12, borderColor: "rgba(255,100,100,0.2)", color: "#ff6464" }} onClick={() => setCancelTarget(b.id)}>{STRINGS.cancel}</button>
                      )}
                      {b.status === "completed" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => setReviewTarget(b)}>Leave Review</button>
                      )}
                      {b.status === "completed" && b.payment_status === "succeeded" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 12, borderColor: "rgba(255,100,100,0.2)", color: "#ff8a80" }} onClick={() => requestRefund(b.id)}>Request refund</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {sessTab === "requests" && (
          <div style={{ padding: "0 0 20px" }}>
            {payout?.needsConnect && (
              <div style={{ padding: "12px 14px", marginBottom: 12, borderRadius: 12, background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.35)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)" }}>💸 You have earnings pending</div>
                <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 4 }}>Connect Stripe to receive payouts for your completed bookings ({(payout.unpaidEarningsCents / 100).toFixed(2)} pending).</div>
                <button className="btn btn-gold" style={{ width: "100%", marginTop: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700, borderRadius: 12 }} onClick={connectStripe}>Connect to get paid</button>
              </div>
            )}
            {myBookings.asHost.length === 0 && (
              <EmptyState icon="🗓️" title="No requests yet" sub="When someone books one of your sessions, you'll see their request here to accept or decline." style={{ padding: "24px 20px" }} />
            )}
            {myBookings.asHost.map(b => {
              const booker = b.user_id || {};
              const sess = b.session_id || {};
              const label = b.status === "pending" ? "Pending" : b.status === "confirmed" ? "Confirmed" : b.status === "completed" ? "Completed" : "Cancelled";
              const statusColors: Record<string, { bg: string; bd: string; c: string }> = {
                completed: BADGE_COLORS.green,
                confirmed: BADGE_COLORS.gold,
                cancelled: BADGE_COLORS.red,
                pending: BADGE_COLORS.muted,
              };
              const sc = statusColors[b.status] || BADGE_COLORS.muted;
              const pp = paymentStatusPill(b.payment_status);
              return (
                <div key={b.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch" }}>
                  <div style={{ position: "relative", width: "25%", alignSelf: "stretch", minHeight: 110, flexShrink: 0 }}>
                    {(booker.avatar || sess.img) && (
                      <Image src={booker.avatar || sess.img} alt={booker.name || "Booker"} fill sizes="25vw" style={{ objectFit: "cover" }} onError={handleImgError} />
                    )}
                  </div>
                  <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div className="conn-name" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                        {booker.name || "Booker"}
                        {booker.verified && <span className="card-verified-mark" style={{ fontSize: 13, cursor: "pointer" }} title="Identity verified" role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: "Verified Member", desc: "Identity verified by Muse — we confirmed this member's government ID and credentials.", icon: "✓", color: "#FFD700" })}>✓</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        {pp && <span role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: pp.label, desc: pp.label === "Payment held" ? "Payment is held in escrow securely until the session is completed." : pp.label === "Paid" ? "Payment completed successfully through secure checkout." : pp.label === "Refunded" ? "This payment was refunded to the client." : pp.label === "Payment failed" ? "The payment attempt failed — no money was taken." : "Payment confirmation state.", icon: "💳", color: pp.colors.c })} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: pp.colors.bg, color: pp.colors.c, border: `1px solid ${pp.colors.bd}`, whiteSpace: "nowrap", cursor: "pointer" }}>{pp.label}</span>}
                        <span role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: label, desc: label === "Pending" ? "Waiting for you to accept or decline this request." : label === "Confirmed" ? "You've confirmed this booking." : label === "Completed" ? "This session has been completed." : label === "Cancelled" ? "This booking was cancelled." : "Current status of this request.", icon: "📋", color: sc.c })} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: sc.bg, color: sc.c, border: `1px solid ${sc.bd}`, whiteSpace: "nowrap", cursor: "pointer" }}>{label}</span>
                      </div>
                    </div>
                    <div className="conn-meta" style={{ fontSize: 12 }}>{sess.title || "Session"} · {sess.rate || "Rate TBD"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {b.status === "pending" && (
                        <>
                          <button className="btn btn-gold" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 700, borderRadius: 12 }} onClick={() => respondBooking(b.id, "accept")}>Accept</button>
                          <button className="btn btn-outline" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => respondBooking(b.id, "decline")}>Decline</button>
                        </>
                      )}
                      {b.status === "confirmed" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => completeBooking(b.id)}>Complete Shoot</button>
                      )}
                      {b.status === "completed" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => setReviewTarget(b)}>Leave Review</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showCreate && (
        <div className="modal-overlay" role="presentation" aria-hidden="true" onClick={() => setShowCreate(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: "90%", padding: 20 }}>
            <div className="modal-title" style={{ marginBottom: 4 }}>List a Session</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Become bookable — set your rate and availability.</div>
            <input className="inp" placeholder="Title (e.g. Portrait Photoshoot)" value={newSession.title} onChange={e => setNewSession(p => ({ ...p, title: e.target.value }))} style={{ marginBottom: 8 }} />
            <textarea className="inp" placeholder="Description" rows={3} value={newSession.description} onChange={e => setNewSession(p => ({ ...p, description: e.target.value }))} style={{ marginBottom: 8, resize: "none" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input className="inp" placeholder="Type" value={newSession.type} onChange={e => setNewSession(p => ({ ...p, type: e.target.value }))} style={{ flex: 1 }} />
              <input className="inp" placeholder="Rate (e.g. $200)" value={newSession.rate} onChange={e => setNewSession(p => ({ ...p, rate: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <input className="inp" placeholder="Duration (e.g. 90 min)" value={newSession.duration} onChange={e => setNewSession(p => ({ ...p, duration: e.target.value }))} style={{ margin: "8px 0" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input className="inp" placeholder="Date" value={newSession.date} onChange={e => setNewSession(p => ({ ...p, date: e.target.value }))} style={{ flex: 1 }} />
              <input className="inp" placeholder="Location" value={newSession.location} onChange={e => setNewSession(p => ({ ...p, location: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <button className="btn btn-gold" style={{ width: "100%", marginTop: 12, fontWeight: 700 }} onClick={submitSession} disabled={creating}>{creating ? "Listing..." : "List Session"}</button>
          </div>
        </div>
      )}
      {cancelTarget && (
        <div className="modal-overlay" role="presentation" aria-hidden="true" onClick={() => setCancelTarget(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, width: "90%", padding: 20 }}>
            <div className="modal-title" style={{ marginBottom: 6 }}>Cancel this booking?</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>Any held payment will be released back to the client.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => setCancelTarget(null)}>{STRINGS.cancel}</button>
              <button className="btn btn-gold" style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: 700, borderRadius: 12, background: "linear-gradient(135deg,#ff6464,#ff8a5c)" }} onClick={() => doCancel(cancelTarget)} disabled={cancelBusy}>{cancelBusy ? "Cancelling..." : "Confirm Cancel"}</button>
            </div>
          </div>
        </div>
      )}
      {reviewTarget && (
        <div className="modal-overlay" role="presentation" aria-hidden="true" onClick={() => setReviewTarget(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: "90%", padding: 20 }}>
            <div className="modal-title" style={{ marginBottom: 4 }}>Leave a Review</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>How was your shoot with {reviewTarget.host_id?.name || reviewTarget.user_id?.name || "them"}?</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setReviewRating(n)} style={{ background: "none", border: "none", fontSize: 30, cursor: "pointer", color: n <= reviewRating ? "var(--gold)" : "rgba(255,255,255,0.2)", lineHeight: 1 }}>{n <= reviewRating ? "★" : "☆"}</button>
              ))}
            </div>
            <textarea className="inp" placeholder="Share your experience (optional)" rows={3} value={reviewBody} onChange={e => setReviewBody(e.target.value)} style={{ resize: "none" }} />
            <button className="btn btn-gold" style={{ width: "100%", marginTop: 12, fontWeight: 700 }} onClick={submitReview} disabled={reviewSending}>{reviewSending ? "Submitting..." : "Submit Review"}</button>
          </div>
        </div>
      )}
      <BadgeInfoModal info={badgeInfo} onClose={() => setBadgeInfo(null)} />
      <Nav active="sessions" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default SessionsScreen;
