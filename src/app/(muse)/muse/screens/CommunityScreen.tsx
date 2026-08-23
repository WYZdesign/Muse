"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft, FiShare2, FiMapPin, FiCalendar, FiUsers, FiX } from "react-icons/fi";
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

async function shareItem(title: string, url: string, showToast: (m: string) => void) {
  if (navigator.share) {
    try { await navigator.share({ title, url }); } catch {}
  } else {
    try { await navigator.clipboard.writeText(url); showToast("Link copied!"); } catch { showToast("Couldn't copy link"); }
  }
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
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", description: "", date: "", location: "", category: "", isNsfw: false });
  const [joinedIds, setJoinedIds] = useState<Set<number | string>>(new Set());
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<"group" | "event" | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState<number | null>(null);
  const [joinLoading, setJoinLoading] = useState<string | null>(null);

  const toggleJoin = async (c: any) => {
    const isJoined = joinedIds.has(c.id);
    setJoinLoading(String(c.id));
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: isJoined ? "leave-community" : "join-community", communityId: c.id }) });
      if (!r.ok) throw new Error("failed");
      setJoinedIds(prev => { const n = new Set(prev); if (isJoined) n.delete(c.id); else n.add(c.id); return n; });
      showToast(isJoined ? "Left " + c.name : "Joined " + c.name + "!");
    } catch { showToast("Couldn't update — try again"); }
    setJoinLoading(null);
  };

  const handleRsvp = async (ev: any) => {
    const isRsvpd = rsvpdEvents.includes(ev.id);
    setRsvpLoading(ev.id);
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: isRsvpd ? "cancel-rsvp" : "rsvp", eventId: ev.id }) });
      if (!r.ok) throw new Error("failed");
      setRsvpdEvents(prev => isRsvpd ? prev.filter((x: number) => x !== ev.id) : [...prev, ev.id]);
      showToast(isRsvpd ? "RSVP cancelled" : "RSVP confirmed!");
    } catch { showToast("Failed to update RSVP"); }
    setRsvpLoading(null);
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

  const openGroupDetail = (c: any) => { setDetailItem(c); setDetailType("group"); };
  const openEventDetail = (ev: any) => { setDetailItem(ev); setDetailType("event"); };

  const groups = (liveCommunities?.length ? liveCommunities : COMMUNITIES).filter((c: any) => showNsfw || !c.nsfw);
  const events = (liveEvents?.length ? liveEvents : EVENTS).filter((e: any) => showNsfw || !e.nsfw);

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

      {/* DETAIL MODAL */}
      {detailItem && detailType && (
        <div className="modal-overlay" style={{ position: "fixed", zIndex: 500 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} onClick={() => setDetailItem(null)} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "85vh", background: "linear-gradient(135deg,#1a0a2e,#2d1b4e)", borderRadius: "24px 24px 0 0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{detailType === "group" ? detailItem.name : detailItem.title}</div>
              <button onClick={() => setDetailItem(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}><FiX size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 100px" }}>
              {detailItem.img && <img src={detailItem.img} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 16, marginBottom: 16 }} onError={handleImgError} />}
              {detailType === "group" ? (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text2)" }}><FiUsers size={14} /> {detailItem.members} members</span>
                    {detailItem.cat && <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)", fontWeight: 600 }}>{detailItem.cat}</span>}
                    {detailItem.nsfw && <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: "rgba(255,69,0,0.15)", border: "1px solid rgba(255,69,0,0.3)", color: "#ff6b6b", fontWeight: 600 }}>18+</span>}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, marginBottom: 20 }}>{detailItem.desc || "No description yet."}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className={joinedIds.has(detailItem.id) ? "btn btn-outline" : "btn btn-gold"} style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12, opacity: joinLoading === String(detailItem.id) ? 0.6 : 1 }} onClick={() => toggleJoin(detailItem)} disabled={joinLoading === String(detailItem.id)}>{joinedIds.has(detailItem.id) ? "✓ Joined" : "Join"}</button>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => shareItem(detailItem.name, "https://muse.wyzdesign.com/community/" + detailItem.id, showToast)}><FiShare2 size={14} /> Share</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text2)" }}><FiCalendar size={14} /> {detailItem.date || "TBD"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text2)" }}><FiMapPin size={14} /> {detailItem.loc || "Online"}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, marginBottom: 20 }}>{detailItem.desc || "No description yet."}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className={"btn " + (rsvpdEvents.includes(detailItem.id) ? "btn-outline" : "btn-gold")} style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12, opacity: rsvpLoading === detailItem.id ? 0.6 : 1 }} onClick={() => handleRsvp(detailItem)} disabled={rsvpLoading === detailItem.id}>{rsvpdEvents.includes(detailItem.id) ? "✓ Going" : "RSVP"}</button>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => shareItem(detailItem.title, "https://muse.wyzdesign.com/event/" + detailItem.id, showToast)}><FiShare2 size={14} /> Share</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <input type="checkbox" checked={form.isNsfw} onChange={e => setForm(p => ({ ...p, isNsfw: e.target.checked }))} style={{ accentColor: "#ffd700", width: 16, height: 16 }} /> 18+ / NSFW group
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
        {commTab === "groups" && groups.map((c: any) => (
          <div key={c.id} className="conn-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden", flexDirection: "column", cursor: "pointer" }} onClick={() => openGroupDetail(c)}>
            <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
              <img loading="lazy" src={c.img} alt={c.name} style={{ width: "30%", minHeight: 120, objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
              <div className="conn-content" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="conn-name" style={{ fontSize: 15 }}>{c.name}</div>
                <div className="conn-meta" style={{ fontSize: 12 }}>{c.members} members</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {c.cat && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)", fontWeight: 600 }}>{c.cat}</span>}
                  {joinedIds.has(c.id) && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(76,221,136,0.12)", border: "1px solid rgba(76,221,136,0.3)", color: "#4cdd88", fontWeight: 700 }}>✓ Joined</span>}
                  {c.nsfw && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(255,69,0,0.15)", border: "1px solid rgba(255,69,0,0.3)", color: "#ff6b6b", fontWeight: 700 }}>18+</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Tap to view details ›</div>
              </div>
            </div>
            <div style={{ padding: "0 14px 14px", width: "100%", position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={joinedIds.has(c.id) ? "btn btn-outline" : "btn btn-gold"} style={{ flex: 1, fontSize: 12, padding: "11px 0", fontWeight: 700, borderRadius: 12, opacity: joinLoading === String(c.id) ? 0.6 : 1 }} onClick={(e) => { e.stopPropagation(); toggleJoin(c); }} disabled={joinLoading === String(c.id)}>{joinedIds.has(c.id) ? "✓ Joined" : "Join"}</button>
                <button className="btn btn-outline" style={{ flex: 1, fontSize: 12, padding: "11px 0", fontWeight: 600, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }} onClick={(e) => { e.stopPropagation(); shareItem(c.name, "https://muse.wyzdesign.com/community/" + c.id, showToast); }}><FiShare2 size={12} /> Share</button>
              </div>
            </div>
          </div>
        ))}
        {commTab === "events" && events.map((ev: any) => (
          <div key={ev.id} className="conn-card" style={{ flexDirection: "column", marginBottom: 10, padding: 0, overflow: "hidden", borderRadius: 16, cursor: "pointer" }} onClick={() => openEventDetail(ev)}>
            {ev.img && <img loading="lazy" src={ev.img} alt={ev.title} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} onError={handleImgError} />}
            <div style={{ padding: 16 }}>
              <div className="conn-name" style={{ fontSize: 15 }}>{ev.title}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {rsvpdEvents.includes(ev.id) && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(76,221,136,0.12)", border: "1px solid rgba(76,221,136,0.3)", color: "#4cdd88", fontWeight: 700 }}>✓ Going</span>}
                {ev.nsfw && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(255,69,0,0.15)", border: "1px solid rgba(255,69,0,0.3)", color: "#ff6b6b", fontWeight: 700 }}>18+</span>}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text2)" }}><FiCalendar size={12} /> {ev.date}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text2)" }}><FiMapPin size={12} /> {ev.loc}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, marginTop: 8, marginBottom: 12 }}>{ev.desc?.slice(0, 80)}{ev.desc?.length > 80 ? "..." : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 16px 16px", width: "100%", position: "relative", zIndex: 1 }}>
              <button className={"btn " + (rsvpdEvents.includes(ev.id) ? "btn-outline" : "btn-gold")} style={{ flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12, opacity: rsvpLoading === ev.id ? 0.6 : 1 }} onClick={(e) => { e.stopPropagation(); handleRsvp(ev); }} disabled={rsvpLoading === ev.id}>{rsvpdEvents.includes(ev.id) ? "✓ Going" : "RSVP"}</button>
              <button className="btn btn-outline" style={{ flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }} onClick={(e) => { e.stopPropagation(); shareItem(ev.title, "https://muse.wyzdesign.com/event/" + ev.id, showToast); }}><FiShare2 size={12} /> Share</button>
            </div>
          </div>
        ))}
      </div>
      <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default CommunityScreen;
