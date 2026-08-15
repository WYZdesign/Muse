"use client";

import React, { memo } from "react";
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
            {/* Sample bookings placeholder */}
            {matches.filter(m => m.booked).length === 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", margin: "4px 0 10px" }}>My Bookings</div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 16 }}>No bookings yet — book a session below to get started</div>
                {[
                  { name: "ARCANA", type: "Photographer", date: "Fri · 2:00 PM", status: "Confirmed", img: "/models/ARCANA/Bodypaint-2.webp" },
                  { name: "MITRI", type: "Producer", date: "Sat · 11:30 AM", status: "Pending", img: "/models/MITRI/Mitri-10.webp" },
                  { name: "NAKIA", type: "Videographer", date: "Mon · 4:00 PM", status: "Confirmed", img: "/models/NAKIA/Nakia-10.webp" },
                ].map((b, i) => (
                  <div key={i} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch" }}>
                    <img loading="lazy" src={b.img} alt={b.name} style={{ width: "28%", alignSelf: "stretch", minHeight: 110, objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
                    <div className="conn-content" style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className="conn-name" style={{ fontSize: 15 }}>{b.name}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: b.status === "Confirmed" ? "rgba(0,230,118,0.15)" : "rgba(255,215,0,0.15)", color: b.status === "Confirmed" ? "var(--mint)" : "var(--gold)" }}>{b.status}</span>
                      </div>
                      <div className="conn-meta" style={{ fontSize: 12 }}>{b.type}</div>
                      <div className="conn-meta" style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>{b.date}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-gold" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, borderRadius: 10 }} onClick={() => openChat({ id: i + 1000, name: b.name, img: b.img, type: b.type, messages: [] })}>Message</button>
                        <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 10 }} onClick={() => { setDisclosureTarget({ id: String(i), name: b.name }); setDisclosureBookingId(String(i)); setShowDisclosureModal(true); }}>Details</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ height: 16 }} />
              </>
            )}
            {/* Available Sessions */}
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "4px 0 10px" }}>Available Sessions</div>
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
                          const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "book-session", sessionId: s.id, hostId: s.id }) });
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
            {[
              { name: "SIMONE", type: "Model", type2: "Photography Session", img: "/models/SIMONE/Simone-107.webp", note: "Would love to do a golden hour editorial shoot" },
              { name: "KAYLEN", type: "Stylist", type2: "Styling Consultation", img: "/models/KAYLEN/kaylen (retouched)-10.webp", note: "Need help with wardrobe for my next campaign" },
              { name: "JERMAINE", type: "Director", type2: "Creative Direction", img: "/models/JERMAINE/Jermaine-20.webp", note: "Looking for a creative director for a music video" },
            ].map((r, i) => (
              <div key={i} className="conn-card" style={{ margin: "0 0 10px", padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch" }}>
                <img loading="lazy" src={r.img} alt={r.name} style={{ width: "25%", alignSelf: "stretch", minHeight: 110, objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
                <div className="conn-content" style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="conn-name" style={{ fontSize: 15 }}>{r.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(212,165,255,0.15)", color: "var(--lavender)" }}>{r.type2}</span>
                  </div>
                  <div className="conn-meta" style={{ fontSize: 12 }}>{r.type}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4, lineHeight: 1.4 }}>{r.note}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn btn-gold" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, borderRadius: 10 }} onClick={() => showToast("Request accepted!")}>Accept</button>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, borderRadius: 10 }} onClick={() => showToast("Request declined")}>Decline</button>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ height: 16 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "4px 0 10px" }}>Sent Requests</div>
            {[
              { name: "DARRYL", type: "Videographer", status: "Pending", img: "/models/DARRYL/Darryl-2.webp", note: "Music video production" },
              { name: "ANGEL", type: "Makeup Artist", status: "Accepted", img: "/models/ANGEL/Angel-2.webp", note: "Editorial makeup session" },
            ].map((r, i) => (
              <div key={i} className="conn-card" style={{ margin: "0 0 10px", padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch" }}>
                <img loading="lazy" src={r.img} alt={r.name} style={{ width: "25%", alignSelf: "stretch", minHeight: 110, objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
                <div className="conn-content" style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="conn-name" style={{ fontSize: 15 }}>{r.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: r.status === "Accepted" ? "rgba(0,230,118,0.15)" : "rgba(255,215,0,0.15)", color: r.status === "Accepted" ? "var(--mint)" : "var(--gold)" }}>{r.status}</span>
                  </div>
                  <div className="conn-meta" style={{ fontSize: 12 }}>{r.type}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{r.note}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default SessionsScreen;
