"use client";

import React, { memo, useState } from "react";
import Image from "next/image";
import { FiArrowLeft } from "react-icons/fi";
import Nav from "../components/Nav";
import { BADGE_COLORS } from "../components/badgeColors";
import FdStudioWidget from "../components/FdStudioWidget";
import type { Screen, Match, SessionListing } from "../components/types";
import { SESSIONS } from "../components/types";
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
  liveSessions?: SessionListing[];
  myBookings?: { asBooker: any[]; asHost: any[] };
  setMyBookings?: React.Dispatch<React.SetStateAction<{ asBooker: any[]; asHost: any[] }>>;
  setDisclosureTarget?: (t: any) => void;
  setDisclosureBookingId?: (id: string) => void;
  setShowDisclosureModal?: (v: boolean) => void;
  setViewProfile?: (p: any) => void;
}

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
  setMatches = () => {},
  liveSessions = [],
  myBookings = { asBooker: [], asHost: [] },
  setMyBookings = () => {},
  setDisclosureTarget = () => {},
  setDisclosureBookingId = () => {},
  setShowDisclosureModal = () => {},
  setViewProfile = () => {},
}: SessionsScreenProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ title: "", description: "", type: "Photoshoot", rate: "", duration: "60 min", date: "", location: "" });
  const [creating, setCreating] = useState(false);
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
    <div className={"screen-el" + (screen === "sessions" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div className="logo-link" style={{ fontSize: 30, backgroundImage: "linear-gradient(90deg,#E1BEE7,#9C27B0,#FF4081,#E1BEE7,#9C27B0,#E1BEE7)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", position: "relative", margin: 0, padding: 0, animation: "lavaFlow 7s ease-in-out infinite,logoShimmer 4s ease-in-out infinite" }}>Sessions</div>
        <div style={{ width: 42 }} />
      </div>
      <div className="conn-tabs" style={{ padding: "0 16px" }}>
        {(["sessions", "bookings", "requests"] as const).map(t => (
          <div key={t} className={"conn-tab" + (sessTab === t ? " active" : "")} role="tab" aria-selected={sessTab === t} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSessTab(t); } }} onClick={() => setSessTab(t)}>{t === "sessions" ? "Browse" : t === "bookings" ? "My Bookings" : "Requests"}</div>
        ))}
      </div>
<div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
            {sessTab === "sessions" && (
              <>
                <div style={{ margin: "4px 0 10px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Available Sessions</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Browse creatives offering sessions — pick one, book, and pay securely.</div>
            {(liveSessions?.length ? liveSessions : SESSIONS as SessionListing[]).map(s => (
              <div key={s.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch", position: "relative" }}>
                <button aria-label="Report session" title="Report" onClick={() => { setReportTarget({ id: s.id, type: "session", name: s.name || "session" }); setShowReport(true); }} style={{ position: "absolute", top: 8, right: 8, zIndex: 2, width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(10,6,18,0.6)", color: "var(--muted)", fontSize: 12, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</button>
                <div style={{ position: "relative", width: "25%", alignSelf: "stretch", minHeight: 120, flexShrink: 0 }}>
                  {s.img && (
                    <Image src={s.img} alt={s.name} fill sizes="25vw" style={{ objectFit: "cover" }} onError={handleImgError} />
                  )}
                </div>
                <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div className="conn-name" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                    {s.name}
                    {s.hostVerified && <span className="card-verified-mark" style={{ fontSize: 13 }} title="Identity verified">✓</span>}
                  </div>
                  <div className="conn-meta" style={{ fontSize: 12 }}>{s.type} · {s.rate} · ★ {s.rating}</div>
                  {!!s.hostCompletedSessions && (
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.hostCompletedSessions} session{s.hostCompletedSessions === 1 ? "" : "s"} completed</div>
                  )}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {(s.skills || []).map((sk: string) => <span key={sk} className="conn-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{sk}</span>)}
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
                    <button className="btn btn-outline" style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 600, borderRadius: 12, whiteSpace: "nowrap" }} onClick={() => setViewProfile(s)}>View Profile</button>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-gold" style={{ width: "100%", padding: "14px 0", fontSize: 13, fontWeight: 700, borderRadius: 12, marginTop: 6 }} onClick={() => setShowCreate(true)}>+ List a Session</button>
            <div style={{ height: 1, margin: "20px 0 4px", background: "linear-gradient(90deg, transparent, rgba(233,30,99,0.4), transparent)" }} />
            <FdStudioWidget apiFetch={apiFetch} />
            <button className="btn btn-gold" style={{ width: "100%", padding: "13px 0", fontSize: 13, fontWeight: 700, borderRadius: 12, marginTop: 6 }} onClick={() => showScreen("studios")}>Browse All LA Studios ↗</button>
          </>
        )}
        {sessTab === "bookings" && (
          <div style={{ padding: "0 0 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", margin: "4px 0 10px" }}>My Bookings</div>
            {myBookings.asBooker.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No bookings yet</div>
                <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>Book a session from the Browse tab. Your bookings will show up here.</div>
              </div>
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
                        {host.verified && <span className="card-verified-mark" style={{ fontSize: 13 }} title="Identity verified">✓</span>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: sc.bg, color: sc.c, border: `1px solid ${sc.bd}`, whiteSpace: "nowrap" }}>{label}</span>
                    </div>
                    <div className="conn-meta" style={{ fontSize: 12 }}>{sess.title || "Session"} · {sess.rate || "Rate TBD"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {b.status === "confirmed" && b.payment_status !== "held" && b.payment_status !== "succeeded" && (
                        <button className="btn btn-gold" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, borderRadius: 12 }} onClick={() => payBooking(b)}>Pay</button>
                      )}
                      {b.status === "confirmed" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => completeBooking(b.id)}>Complete</button>
                      )}
                      {(b.status === "pending" || b.status === "confirmed") && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 12, borderColor: "rgba(255,100,100,0.2)", color: "#ff6464" }} onClick={() => setCancelTarget(b.id)}>{STRINGS.cancel}</button>
                      )}
                      {b.status === "completed" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => setReviewTarget(b)}>Leave Review</button>
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
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", margin: "4px 0 10px" }}>Incoming Requests</div>
            {myBookings.asHost.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗓️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No requests yet</div>
                <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>When someone books one of your sessions, you'll see their request here to accept or decline.</div>
              </div>
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
                        {booker.verified && <span className="card-verified-mark" style={{ fontSize: 13 }} title="Identity verified">✓</span>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: sc.bg, border: `1px solid ${sc.bd}`, color: sc.c, whiteSpace: "nowrap" }}>{label}</span>
                    </div>
                    <div className="conn-meta" style={{ fontSize: 12 }}>{sess.title || "Session"} · {sess.rate || "Rate TBD"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {b.status === "pending" && (
                        <>
                          <button className="btn btn-gold" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, borderRadius: 12 }} onClick={() => respondBooking(b.id, "accept")}>Accept</button>
                          <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => respondBooking(b.id, "decline")}>Decline</button>
                        </>
                      )}
                      {b.status === "confirmed" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => completeBooking(b.id)}>Complete Shoot</button>
                      )}
                      {b.status === "completed" && (
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => setReviewTarget(b)}>Leave Review</button>
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
              <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 12 }} onClick={() => setCancelTarget(null)}>{STRINGS.cancel}</button>
              <button className="btn btn-gold" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, borderRadius: 12, background: "linear-gradient(135deg,#ff6464,#ff8a5c)" }} onClick={() => doCancel(cancelTarget)} disabled={cancelBusy}>{cancelBusy ? "Cancelling..." : "Confirm Cancel"}</button>
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
      <Nav active="sessions" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default SessionsScreen;
