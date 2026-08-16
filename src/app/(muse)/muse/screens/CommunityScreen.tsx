"use client";

import React, { memo } from "react";
import { FiArrowLeft } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";
import { COMMUNITIES, EVENTS } from "../components/types";

export interface CommunityScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  commTab: "groups" | "events";
  setCommTab: (t: "groups" | "events") => void;
  liveCommunities: any[] | null;
  liveEvents: any[] | null;
  showNsfw: boolean;
  rsvpdEvents: number[];
  setRsvpdEvents: React.Dispatch<React.SetStateAction<number[]>>;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  openHamburger?: () => void;
  unreadNotificationCount?: number;
}

export const CommunityScreen = memo(function CommunityScreen({
  screen,
  commTab,
  setCommTab,
  showNsfw,
  liveCommunities,
  liveEvents,
  rsvpdEvents,
  setRsvpdEvents,
  showScreen,
  openHamburger,
  unreadNotificationCount,
  showToast,
  handleImgError,
  apiFetch,
}: CommunityScreenProps) {
  return (
    <div className={"screen-el" + (screen === "community" ? " active" : "")}>
      <div className="hdr">
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <span style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>Community</span>
        <div style={{ width: 36 }} />
      </div>
      <div className="conn-tabs" style={{ padding: "0 16px" }}>
        {(["groups", "events"] as const).map(t => (
          <div key={t} className={"conn-tab" + (commTab === t ? " active" : "")} onClick={() => setCommTab(t)}>{t === "groups" ? "Groups" : "Events"}</div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
        {commTab === "groups" && (liveCommunities?.length ? liveCommunities : COMMUNITIES).filter((c: any) => showNsfw || !c.nsfw).map((c: any) => (
          <div key={c.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "row", alignItems: "stretch" }}>
            <img loading="lazy" src={c.img} alt={c.name} style={{ width: "30%", alignSelf: "stretch", minHeight: 120, objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
            <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="conn-name" style={{ fontSize: 15 }}>{c.name}</div>
              <div className="conn-meta" style={{ fontSize: 12 }}>{c.members} members · {c.desc}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-gold" style={{ flex: 1, fontSize: 12, padding: "12px 0", fontWeight: 700, borderRadius: 12 }} onClick={async () => { try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join-community", communityId: c.id }) }); if (!r.ok) throw new Error("failed"); showToast("Joined " + c.name + "!"); } catch { showToast("Failed to join"); } }}>{c.cat === "nsfw" ? "Join (18+)" : "Join"}</button>
                <button className="btn btn-outline" style={{ flex: 1, fontSize: 12, padding: "12px 0", fontWeight: 600, borderRadius: 12 }} onClick={() => showToast(c.name + " community info opened!")}>Learn</button>
                <button className="btn btn-outline" style={{ flex: 1, fontSize: 12, padding: "12px 0", fontWeight: 600, borderRadius: 12 }} onClick={() => { navigator.clipboard?.writeText("https://wyzdesign.com/muse/community/" + c.id); showToast("Link copied!"); }}>Share</button>
              </div>
            </div>
          </div>
        ))}
        {commTab === "events" && (liveEvents?.length ? liveEvents : EVENTS).filter((e: any) => showNsfw || !e.nsfw).map((ev: any) => (
          <div key={ev.id} className="conn-card" style={{ flexDirection: "column", marginBottom: 10, padding: 0, overflow: "hidden", borderRadius: 16 }}>
            {ev.img && <img loading="lazy" src={ev.img} alt={ev.title} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} onError={handleImgError} />}
            <div style={{ padding: 16 }}>
              <div className="conn-name" style={{ fontSize: 15 }}>{ev.title}</div>
              <div className="conn-meta" style={{ fontSize: 12, marginBottom: 6 }}>{ev.date} · {ev.loc}</div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, marginBottom: 10 }}>{ev.desc}</div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 16px 16px", width: "100%" }}>
              <button className={"btn " + (rsvpdEvents.includes(ev.id) ? "btn-outline" : "btn-gold")} style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }} onClick={() => { setRsvpdEvents(prev => prev.includes(ev.id) ? prev.filter((x: number) => x !== ev.id) : [...prev, ev.id]); showToast(rsvpdEvents.includes(ev.id) ? "RSVP cancelled" : "RSVP confirmed!"); }}>{rsvpdEvents.includes(ev.id) ? "Going" : "RSVP"}</button>
              <button className="btn btn-outline" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12 }} onClick={() => { navigator.clipboard?.writeText("https://wyzdesign.com/muse/event/" + ev.id); showToast("Event link copied!"); }}>Share</button>
            </div>
          </div>
        ))}
        {commTab === "events" && EVENTS.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 13 }}>No upcoming events</div>
        )}
      </div>
      <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default CommunityScreen;
