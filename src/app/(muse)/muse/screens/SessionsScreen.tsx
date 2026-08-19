"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen, Match } from "../components/types";
import { SESSIONS } from "../components/types";

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
  showToast: (msg: string) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  uid: () => any;
  currentUser: any;
  setShowAgeVerification: (v: boolean) => void;
  openHamburger?: () => void;
  unreadNotificationCount?: number;
  liveSessions?: any[];
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
  uid,
  currentUser,
  apiFetch,
  authFetch,
  openHamburger,
  unreadNotificationCount,
  setMatches = () => {},
  liveSessions = [],
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
  return (
    <div className={"screen-el" + (screen === "sessions" ? " active" : "")}>
      <div className="hdr">
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <span style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>Sessions</span>
        <div style={{ width: 36 }} />
      </div>
      <div className="conn-tabs" style={{ padding: "0 16px" }}>
        {(["sessions", "requests"] as const).map(t => (
          <div key={t} className={"conn-tab" + (sessTab === t ? " active" : "")} onClick={() => setSessTab(t)}>{t === "sessions" ? "My Bookings" : "Requests"}</div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
        {sessTab === "sessions" && (
          <>
            {/* My Bookings */}
            {matches.filter(m => m.booked).length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", margin: "4px 0 10px" }}>My Bookings</div>
                {matches.filter(m => m.booked).map(m => (
                  <div key={m.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch" }}>
                    <img loading="lazy" src={m.img} alt={m.name} style={{ width: "25%", alignSelf: "stretch", minHeight: 120, objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
                    <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div className="conn-name" style={{ fontSize: 15 }}>{m.name}</div>
                      <div className="conn-meta" style={{ fontSize: 12 }}>{m.type} · Booked Session</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-gold" style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 700, borderRadius: 12, whiteSpace: "nowrap" }} onClick={() => { openChat(m); }}>Message</button>
                        <button className="btn btn-outline" style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 600, borderRadius: 12, whiteSpace: "nowrap" }} onClick={() => { setChatTarget(m); showScreen("chat"); }}>Details</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ height: 16 }} />
              </>
            )}
            {/* Empty state — no fabricated bookings */}
            {matches.filter(m => m.booked).length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No bookings yet</div>
                <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>Book a session with a creative below. Your confirmed bookings will show up here.</div>
              </div>
            )}
            {/* Available Sessions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0 10px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Available Sessions</div>
              <button className="btn btn-gold" style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 99 }} onClick={() => setShowCreate(true)}>+ List a Session</button>
            </div>
            {(liveSessions || SESSIONS).map(s => (
              <div key={s.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch" }}>
                <img loading="lazy" src={s.img} alt={s.name} style={{ width: "25%", alignSelf: "stretch", minHeight: 120, objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
                <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div className="conn-name" style={{ fontSize: 15 }}>{s.name}</div>
                  <div className="conn-meta" style={{ fontSize: 12 }}>{s.type} · {s.rate} · ★ {s.rating}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {(s.skills || []).map((sk: string) => <span key={sk} className="conn-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{sk}</span>)}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      className="btn btn-gold"
                      style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 700, borderRadius: 12, whiteSpace: "nowrap" }}
                      onClick={async () => {
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
                        }
                      }}
                    >
                      {s.available ? "Book Session" : "Waitlist"}
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 600, borderRadius: 12, whiteSpace: "nowrap" }} onClick={() => { setViewProfile(s); showToast(s.name + "'s profile"); }}>View Profile</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        {sessTab === "requests" && (
          <div style={{ padding: "0 0 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", margin: "4px 0 10px" }}>Incoming Requests</div>
            <div style={{ textAlign: "center", padding: "32px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗓️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No requests yet</div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>When someone books one of your sessions, you'll see their request here to accept or decline.</div>
            </div>
            <div style={{ height: 16 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "4px 0 10px" }}>Sent Requests</div>
            <div style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>Requests you send to book a creative's session will show up here with their status.</div>
            </div>
          </div>
        )}
      </div>
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
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
      <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default SessionsScreen;
