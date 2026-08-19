"use client";

import React, { memo } from "react";
import { FiArrowLeft, FiPlus } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen, Brief } from "../components/types";
import { BRIEFS } from "../components/types";

export interface CollabScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  museCat: "all" | "tfp" | "paid" | "opencall" | "concept";
  setMuseCat: (c: "all" | "tfp" | "paid" | "opencall" | "concept") => void;
  userBriefs: any[];
  setUserBriefs: React.Dispatch<React.SetStateAction<any[]>>;
  showPostBrief: boolean;
  setShowPostBrief: (v: boolean) => void;
  liveBriefs: any[];
  showNsfw: boolean;
  currentUser: any;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string) => void;
  uid: () => any;
  openHamburger?: () => void;
  unreadNotificationCount?: number;
  appliedBriefs?: number[];
  setAppliedBriefs?: React.Dispatch<React.SetStateAction<number[]>>;
  savedBriefs?: number[];
  setSavedBriefs?: React.Dispatch<React.SetStateAction<number[]>>;
  setChatTarget?: (t: any) => void;
  briefTitle?: string;
  setBriefTitle?: (v: string) => void;
  briefDesc?: string;
  setBriefDesc?: (v: string) => void;
  briefBudget?: string;
  setBriefBudget?: (v: string) => void;
  briefCat?: "tfp" | "paid" | "opencall" | "concept";
  setBriefCat?: (c: "tfp" | "paid" | "opencall" | "concept") => void;
}

export const CollabScreen = memo(function CollabScreen({
  screen,
  showScreen,
  museCat,
  setMuseCat,
  userBriefs,
  setUserBriefs,
  showPostBrief,
  setShowPostBrief,
  liveBriefs,
  showNsfw,
  currentUser,
  apiFetch,
  showToast,
  uid,
  appliedBriefs = [],
  setAppliedBriefs = () => {},
  savedBriefs = [],
  setSavedBriefs = () => {},
  setChatTarget = () => {},
  briefTitle = "",
  setBriefTitle = () => {},
  briefDesc = "",
  setBriefDesc = () => {},
  briefBudget = "",
  setBriefBudget = () => {},
  briefCat = "concept" as "tfp" | "paid" | "opencall" | "concept",
  setBriefCat = () => {},
  openHamburger,
  unreadNotificationCount,
}: CollabScreenProps) {
  const submitBrief = async () => {
    if (!briefTitle.trim()) { showToast("Title required"); return; }
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "brief", title: briefTitle.trim(), desc: briefDesc.trim(), budget: briefBudget.trim() || "Negotiable", cat: briefCat, tags: [], paid: briefCat === "paid" }) });
      if (!r.ok) throw new Error("failed");
      setUserBriefs((prev: any[]) => [{ id: uid(), title: briefTitle.trim(), desc: briefDesc.trim(), budget: briefBudget.trim() || "Negotiable", tags: [], cat: briefCat, author: currentUser.name, authorImg: currentUser.avatar, deadline: "Flexible", urgent: false, nsfw: false }, ...prev]);
      setShowPostBrief(false);
      setBriefTitle(""); setBriefDesc(""); setBriefBudget(""); setBriefCat("concept");
      showToast("Brief posted!");
    } catch { showToast("Failed to post brief"); }
  };
  return (
    <div className={"screen-el" + (screen === "briefs" ? " active" : "")}>
      <div className="hdr">
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div
          className="logo-link"
          style={{
            fontSize: 32,
            backgroundImage: "linear-gradient(90deg,#20B2AA,#9ACD32,#00CED1,#20B2AA,#7CFC00,#20B2AA)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          Collab
        </div>
        <button className="hdr-btn" onClick={() => setShowPostBrief(true)} aria-label="Create Brief"><FiPlus size={18} /></button>
      </div>
      <div className="conn-tabs" style={{ padding: "0 12px" }}>
        {([["all", "All"], ["tfp", "TFP"], ["paid", "Paid"], ["opencall", "Open Call"], ["vision", "Concept"]] as const).map(([k, l]) => (
          <div key={k} className={"conn-tab" + (museCat === k ? " active" : "")} onClick={() => setMuseCat(k as any)}>{l}</div>
        ))}
      </div>
      <div className="briefs-scroll">
        {(() => {
          const allBriefs = [
            ...userBriefs.map(b => ({
              ...b,
              author: currentUser.name,
              authorImg: currentUser.avatar,
              deadline: "Flexible",
              urgent: false,
              nsfw: false,
              cat: b.cat || "vision",
            })),
            ...(liveBriefs?.length ? liveBriefs : BRIEFS),
          ];
          const filtered = museCat === "all" ? allBriefs : allBriefs.filter(b => b.cat === museCat);
          if (filtered.length === 0) {
            return (
              <div className="empty-state">
                <div className="empty-icon"><FiPlus size={48} /></div>
                <div className="empty-title">No posts yet</div>
                <div className="empty-sub">{museCat === "all" ? "Post a project, collab, or idea" : "No " + museCat + " posts yet, be the first!"}</div>
              </div>
            );
          }
          return filtered.map(brief => (
            <div key={brief.id} className="brief-card">
              <div className="brief-header" style={{ flexWrap: "wrap", gap: 6 }}>
                <img loading="lazy" src={brief.authorImg} alt={brief.author} className="brief-avatar" />
                <div className="brief-info" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="brief-author"><strong>{brief.author}</strong></div>
                  <div className="brief-meta">{brief.budget} · {brief.deadline}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4, width: "100%", justifyContent: "center" }}>
                  {brief.cat === "tfp" && <span className="brief-tag" style={{ background: "rgba(152,251,152,0.15)", borderColor: "rgba(152,251,152,0.3)", color: "var(--mint)" }}>TFP</span>}
                  {brief.cat === "paid" && <span className="brief-tag" style={{ background: "rgba(255,215,0,0.12)", borderColor: "rgba(255,215,0,0.2)", color: "var(--gold)" }}>Paid</span>}
                  {brief.cat === "opencall" && <span className="brief-tag" style={{ background: "rgba(135,206,235,0.12)", borderColor: "rgba(135,206,235,0.25)", color: "#87CEEB" }}>Open Call</span>}
                  {brief.cat === "vision" && <span className="brief-tag" style={{ background: "rgba(212,165,255,0.12)", borderColor: "rgba(212,165,255,0.25)", color: "var(--lavender)" }}>Ideas</span>}
                  {brief.urgent && <span className="brief-tag" style={{ background: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.3)", color: "var(--coral)" }}>Urgent</span>}
                  {brief.nsfw && <span className="brief-tag" style={{ background: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.3)", color: "var(--sunset)" }}>18+</span>}
                </div>
              </div>
              <div className="brief-title">{brief.title}</div>
              <div className="brief-desc">{brief.desc}</div>
              <div className="brief-tags">{brief.tags.map((t: string) => <span key={t} className="brief-tag">{t}</span>)}</div>
              <div className="brief-actions">
                {brief.cat === "vision" ? (
                  <button className="brief-btn-apply" style={{ padding: "8px 14px", fontSize: 12 }} onClick={() => { setChatTarget({ id: brief.id, name: brief.author, type: "Creative", img: brief.authorImg, messages: [] }); showScreen("chat"); }}>Respond</button>
                ) : (
                  <button
                    className={"brief-btn-apply" + (appliedBriefs.includes(brief.id) ? " applied" : "")}
                    style={{ padding: "8px 14px", fontSize: 12 }}
                    onClick={async () => {
                      if (!appliedBriefs.includes(brief.id)) {
                        setAppliedBriefs([...appliedBriefs, brief.id]);
                        try {
                          await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "brief-apply", briefId: brief.id }) });
                          showToast("Applied!");
                        } catch {
                          showToast("Failed to apply");
                          setAppliedBriefs(prev => prev.filter(x => x !== brief.id));
                        }
                      }
                    }}
                  >
                    {appliedBriefs.includes(brief.id) ? "Applied" : "Apply"}
                  </button>
                )}
                {brief.cat === "paid" && (
                  <button className="brief-btn-apply" style={{ background: "rgba(212,165,255,0.1)", borderColor: "rgba(212,165,255,0.2)", color: "var(--lavender)", padding: "8px 14px", fontSize: 12 }} onClick={() => { showToast("Sent to Sessions!"); }}>Book</button>
                )}
                <button
                  className={"brief-btn-save" + (savedBriefs.includes(brief.id) ? " saved" : "")}
                  style={{ padding: "8px 14px", fontSize: 12 }}
                  onClick={() => {
                    if (savedBriefs.includes(brief.id)) {
                      setSavedBriefs(savedBriefs.filter(x => x !== brief.id));
                      showToast("Unsaved");
                    } else {
                      setSavedBriefs([...savedBriefs, brief.id]);
                      showToast("Saved!");
                    }
                  }}
                >
                  {savedBriefs.includes(brief.id) ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          ));
        })()}
      </div>
      {showPostBrief && (
        <div className="modal-overlay" onClick={() => setShowPostBrief(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: "90%", padding: 20 }}>
            <div className="modal-title" style={{ marginBottom: 4 }}>Post a Brief</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Share a project, collab, or open call.</div>
            <input className="inp" placeholder="Title" value={briefTitle} onChange={e => setBriefTitle(e.target.value)} style={{ marginBottom: 8 }} />
            <textarea className="inp" placeholder="Describe the project" rows={3} value={briefDesc} onChange={e => setBriefDesc(e.target.value)} style={{ marginBottom: 8, resize: "none" }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input className="inp" placeholder="Budget" value={briefBudget} onChange={e => setBriefBudget(e.target.value)} style={{ flex: 1 }} />
              <select className="inp" value={briefCat} onChange={e => setBriefCat(e.target.value as any)} style={{ flex: 1 }}>
                <option value="concept">Concept</option>
                <option value="tfp">TFP</option>
                <option value="paid">Paid</option>
                <option value="opencall">Open Call</option>
              </select>
            </div>
            <button className="btn btn-gold" style={{ width: "100%", fontWeight: 700 }} onClick={submitBrief}>Post Brief</button>
          </div>
        </div>
      )}
      <Nav active="briefs" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default CollabScreen;
