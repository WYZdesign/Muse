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
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", title: "", description: "", date: "", location: "", category: "", isNsfw: false });
  const [joinedIds, setJoinedIds] = React.useState<Set<number | string>>(new Set());
  const [learnId, setLearnId] = React.useState<number | string | null>(null);

  const toggleJoin = async (c: any) => {
    const isJoined = joinedIds.has(c.id);
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: isJoined ? "leave-community" : "join-community", communityId: c.id }) });
      if (!r.ok) throw new Error("failed");
      setJoinedIds(prev => { const n = new Set(prev); if (isJoined) n.delete(c.id); else n.add(c.id); return n; });
      showToast(isJoined ? "Left " + c.name : "Joined " + c.name + "!");
    } catch { showToast("Couldn't update membership — try again"); }
  };

  const submitCreate = async () => {
    try {
      if (commTab === "groups") {
        if (!form.name.trim()) { showToast("Name required"); return; }
        const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-community", name: form.name, description: form.description, category: form.category, isNsfw: form.isNsfw }) });
        if (!r.ok) throw new Error("failed");
        showToast("Group created!");
      } else {
        if (!form.title.trim()) { showToast("Title required"); return; }
        const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-event", title: form.title, description: form.description, date: form.date, location: form.location, category: form.category }) });
        if (!r.ok) throw new Error("failed");
        showToast("Event created!");
      }
      setShowCreate(false);
      setForm({ name: "", title: "", description: "", date: "", location: "", category: "", isNsfw: false });
    } catch { showToast("Failed to create"); }
  };

  return (
    <div className={"screen-el" + (screen === "community" ? " active" : "")}>
      <div className="hdr">
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <span style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>Community</span>
        <button className="hdr-btn" onClick={() => setShowCreate(v => !v)} aria-label="Create" style={{ width: 34, height: 34 }}>+</button>
      </div>
      <div className="conn-tabs" style={{ padding: "0 16px" }}>
        {(["groups", "events"] as const).map(t => (
          <div key={t} className={"conn-tab" + (commTab === t ? " active" : "")} onClick={() => setCommTab(t)}>{t === "groups" ? "Groups" : "Events"}</div>
        ))}
      </div>
      {showCreate && (
        <div className="modal-overlay" style={{ position: "fixed", zIndex: 400 }}>
          <div className="modal-header">
            <button className="modal-back" onClick={() => setShowCreate(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">{commTab === "groups" ? "Create Group" : "Create Event"}</div>
            <button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Close">✕</button>
          </div>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {commTab === "groups" ? (
              <>
                <input className="inp" placeholder="Group name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ marginBottom: 8 }} />
                <input className="inp" placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ marginBottom: 8 }} />
                <input className="inp" placeholder="Category (e.g. Photography, Fashion)" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ marginBottom: 10 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text2)", marginBottom: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.isNsfw} onChange={e => setForm(p => ({ ...p, isNsfw: e.target.checked }))} /> 18+ / NSFW group
                </label>
              </>
            ) : (
              <>
                <input className="inp" placeholder="Event title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={{ marginBottom: 8 }} />
                <input className="inp" placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ marginBottom: 8 }} />
                <input className="inp" placeholder="Date (e.g. Aug 28, 2026)" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ marginBottom: 8 }} />
                <input className="inp" placeholder="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={{ marginBottom: 10 }} />
              </>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-gold" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }} onClick={submitCreate}>Create</button>
              <button className="btn btn-outline" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12 }} onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
        {commTab === "groups" && (liveCommunities?.length ? liveCommunities : COMMUNITIES).filter((c: any) => showNsfw || !c.nsfw).map((c: any) => (
          <div key={c.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
              <img loading="lazy" src={c.img} alt={c.name} style={{ width: "30%", minHeight: 120, objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
              <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="conn-name" style={{ fontSize: 15 }}>{c.name}</div>
                <div className="conn-meta" style={{ fontSize: 12 }}>{c.members} members</div>
              </div>
            </div>
            <div style={{ padding: "0 14px 14px", width: "100%" }}>
              {learnId === c.id && <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 10, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>{c.desc}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button className={joinedIds.has(c.id) ? "btn btn-outline" : "btn btn-gold"} style={{ width: "100%", fontSize: 13, padding: "13px 0", fontWeight: 700, borderRadius: 12 }} onClick={() => toggleJoin(c)}>{joinedIds.has(c.id) ? "✓ Joined" : (c.cat === "nsfw" ? "Join (18+)" : "Join")}</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, fontSize: 12, padding: "11px 0", fontWeight: 600, borderRadius: 12 }} onClick={() => setLearnId(learnId === c.id ? null : c.id)}>{learnId === c.id ? "Hide" : "Learn"}</button>
                  <button className="btn btn-outline" style={{ flex: 1, fontSize: 12, padding: "11px 0", fontWeight: 600, borderRadius: 12 }} onClick={() => { navigator.clipboard?.writeText("https://wyzdesign.com/muse/community/" + c.id); showToast("Link copied!"); }}>Share</button>
                </div>
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
              <button className={"btn " + (rsvpdEvents.includes(ev.id) ? "btn-outline" : "btn-gold")} style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }} onClick={async () => { const isRsvpd = rsvpdEvents.includes(ev.id); try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: isRsvpd ? "cancel-rsvp" : "rsvp", eventId: ev.id }) }); setRsvpdEvents(prev => isRsvpd ? prev.filter((x: number) => x !== ev.id) : [...prev, ev.id]); showToast(isRsvpd ? "RSVP cancelled" : "RSVP confirmed!"); } catch { showToast("Failed to update RSVP"); } }}>{rsvpdEvents.includes(ev.id) ? "Going" : "RSVP"}</button>
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
