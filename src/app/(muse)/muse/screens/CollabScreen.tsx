"use client";

import React, { memo, useEffect, useState } from "react";
import Image from "next/image";
import { FiArrowLeft, FiPlus, FiSearch, FiGrid, FiRepeat, FiDollarSign, FiVolume2, FiZap } from "react-icons/fi";
import { matchesBriefSearch } from "../components/searchMatch";
import Nav from "../components/Nav";
import { EmptyState } from "../components/EmptyState";
import type { Screen, Brief } from "../components/types";
import { BRIEFS } from "../components/types";
import { viewerSide } from "@/lib/role";
import { ensureDeviceTiltActive, getDeviceTilt } from "../hooks/useDeviceTilt";

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
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
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
  // Long brief descriptions used to always render in full, which could bloat
  // a card well past its neighbors in a scrolling list (LinkedIn's inline
  // "...more" pattern, audit finding li-1). Briefs have no detail screen to
  // click through to (unlike Feed posts, which already open a post-detail
  // view), so this needs its own expand toggle rather than just a CSS clamp.
  const [expandedBriefIds, setExpandedBriefIds] = useState<Set<any>>(new Set());

  // Two independent audit findings (Thumbtack's "Describe your project"
  // free-text search, TaskRabbit's near-identical placeholder) converged on
  // the same idea: a text search entry point alongside category filters.
  // Collab had category chips only, no way to search briefs by title/desc —
  // this is a client-side filter over the already-fetched brief list, same
  // shape as MusesScreen's existing search-toggle pattern, no backend change.
  const [briefSearchOpen, setBriefSearchOpen] = useState(false);
  const [briefSearchQuery, setBriefSearchQuery] = useState("");

  // "Not interested" / dismiss (audit finding up-3, LinkedIn/Facebook-style
  // feed hide). Session-local only, same as savedBriefs/appliedBriefs
  // elsewhere in this hook family — there's no per-user "hidden briefs"
  // table on the backend, and adding one is a bigger change than this pass
  // is scoped for. A toast with Undo keeps the dismiss from being a trap.
  const [hiddenBriefIds, setHiddenBriefIds] = useState<Set<any>>(new Set());
  const hideBrief = (id: any) => {
    setHiddenBriefIds(prev => new Set(prev).add(id));
    showToast({ msg: "Hidden from your feed", onTap: () => setHiddenBriefIds(prev => { const next = new Set(prev); next.delete(id); return next; }) });
  };

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

  // Collab had no tilt/parallax at all — every other primary screen (Discover's
  // swipe card, Network's pro cards, Muses' grid) gets this ambient motion, so
  // the page read as flat/dead next to the rest of the app. Brief cards don't
  // have a big hero photo (just a small round avatar), so this applies the
  // lighter container-level float used on Feed/BTS/Community rather than the
  // full 3D image-tilt treatment, which would look wrong on a circular avatar.
  useEffect(() => {
    if (screen !== "briefs") return;
    ensureDeviceTiltActive();
    let raf = 0;
    const tick = () => {
      const { x, y } = getDeviceTilt();
      document.querySelectorAll<HTMLElement>(".brief-card").forEach((card) => {
        card.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  return (
    <div className={"screen-el" + (screen === "briefs" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div
          className="logo-link"
          style={{
            fontSize: 30,
            backgroundImage: "linear-gradient(90deg,#FFB5C2,#FFD700,#D4A5FF,#FFB5C2,#FFD700,#FFB5C2)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            position: "relative",
            margin: 0,
            padding: 0,
            whiteSpace: "nowrap",
          }}
        >Collab</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="hdr-btn" onClick={() => setBriefSearchOpen(v => !v)} aria-label="Search briefs"><FiSearch size={17} /></button>
          <button className="hdr-btn" onClick={() => setShowPostBrief(true)} aria-label="Create Brief"><FiPlus size={18} /></button>
        </div>
      </div>
      <div className="conn-tabs" style={{ padding: "0 12px", justifyContent: "center" }}>
        {/* Small leading icon per tab (audit finding tu-2) — text-only tabs
            work fine at this row length, but a glance-able icon removes a
            beat of reading for a frequently-tapped row like this one. Kept
            to a plain 11px icon, no extra vertical space taken. */}
        {([["all", "All", FiGrid], ["tfp", "TFP", FiRepeat], ["paid", "Paid", FiDollarSign], ["opencall", "Open Call", FiVolume2], ["concept", "Concept", FiZap]] as const).map(([k, l, Icon]) => (
          <div key={k} className={"conn-tab" + (museCat === k ? " active" : "")} role="tab" aria-selected={museCat === k} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMuseCat(k as any); } }} onClick={() => setMuseCat(k as any)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon size={11} />{l}
          </div>
        ))}
      </div>
      {briefSearchOpen && (
        <div style={{ margin: "0 12px 12px", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px 12px", animation: "fadeIn .2s ease" }}>
          <FiSearch size={14} color="var(--muted)" />
          <input className="inp" placeholder="Describe what you're looking for..." value={briefSearchQuery} onChange={e => setBriefSearchQuery(e.target.value)} autoFocus style={{ flex: 1, margin: 0, padding: "4px 0", border: "none", background: "transparent", fontSize: 13, color: "var(--text)" }} />
          {briefSearchQuery && <button onClick={() => setBriefSearchQuery("")} aria-label="Clear search" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>}
        </div>
      )}
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
              cat: b.cat || "concept",
            })),
            ...(liveBriefs?.length ? liveBriefs : BRIEFS),
          ];
          let filtered = (museCat === "all" ? allBriefs : allBriefs.filter(b => b.cat === museCat)).filter(b => !hiddenBriefIds.has(b.id));
          if (briefSearchQuery.trim()) {
            filtered = filtered.filter(b => matchesBriefSearch(b, briefSearchQuery));
          }
          // Duality P1 — industry (hiring) sees their own briefs first so
          // applicants stay front-of-mind; creatives browse others' work with
          // their own posts pushed to the end.
          const side = viewerSide(currentUser?.type);
          // userBriefs only covers briefs posted THIS session (local state);
          // a brief the current user posted in an earlier session arrives
          // through liveBriefs instead, identified by its author_id join —
          // both are checked so "is this my own brief?" is correct either way.
          const localOwnIds = new Set(userBriefs.map(b => b.id));
          const isOwnBrief = (b: any) => localOwnIds.has(b.id) || b.author_id?.id === currentUser?.id;
          const ordered = side === "industry"
            ? [...filtered.filter(isOwnBrief), ...filtered.filter(b => !isOwnBrief(b))]
            : [...filtered.filter(b => !isOwnBrief(b)), ...filtered.filter(isOwnBrief)];
          if (filtered.length === 0) {
            return briefSearchQuery.trim() ? (
              <EmptyState icon={<FiSearch size={44} />} title="No matches" sub={`Nothing found for "${briefSearchQuery.trim()}"`}>
                <button className="btn btn-outline" style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => setBriefSearchQuery("")}>Clear Search</button>
              </EmptyState>
            ) : (
              <EmptyState icon={<FiPlus size={48} />} title="No posts yet" sub={museCat === "all" ? "Post a project, collab, or idea" : "No " + museCat + " posts yet, be the first!"}>
                <button className="btn btn-gold" style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => setShowPostBrief(true)}>Post a Brief</button>
              </EmptyState>
            );
          }
          return ordered.map((brief, bi) => (
            <div key={brief.id} className="brief-card" style={{ position: "relative" }}>
              {!isOwnBrief(brief) && (
                <button
                  aria-label="Not interested"
                  title="Not interested"
                  onClick={() => hideBrief(brief.id)}
                  style={{ position: "absolute", top: 14, right: 14, zIndex: 2, width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(10,6,18,0.6)", color: "var(--muted)", fontSize: 12, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >✕</button>
              )}
              <div className="brief-header" style={{ flexWrap: "wrap", gap: 6 }}>
                <Image loading="lazy" src={brief.authorImg} alt={brief.author} width={86} height={86} className={"brief-avatar brief-variant-" + (bi % 5)} />
                <div className="brief-info" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="brief-author"><strong>{brief.author}</strong></div>
                  <div className="brief-meta" style={{ flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span className="brief-meta-item"><strong>{brief.budget}</strong></span>
                    <span className="brief-meta-item">⏱ Timeline: {brief.deadline}</span>
                    {isOwnBrief(brief) && brief.cat !== "concept" && (
                      <span className="brief-meta-item" style={{ color: "var(--gold)" }}>
                        👥 {brief.applicantCount || 0} applied
                      </span>
                    )}
                    {/* Competition signal for browsers, not just the poster (audit
                        finding upwork-p2-1) — same applicantCount data already
                        fetched for the owner's own view, just surfaced to everyone
                        so a creative can gauge their odds before applying. Only
                        shown once there's at least one applicant — "0 interested"
                        on a fresh post would read as a discouraging non-signal. */}
                    {!isOwnBrief(brief) && brief.cat !== "concept" && !!brief.applicantCount && (
                      <span className="brief-meta-item" style={{ color: "var(--muted)" }}>
                        👥 {brief.applicantCount} interested
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4, width: "100%", justifyContent: "center" }}>
                  {brief.cat === "tfp" && <span className="brief-tag" style={{ background: "rgba(152,251,152,0.15)", borderColor: "rgba(152,251,152,0.3)", color: "var(--mint)" }}>TFP</span>}
                  {brief.cat === "paid" && <span className="brief-tag" style={{ background: "rgba(255,215,0,0.12)", borderColor: "rgba(255,215,0,0.2)", color: "var(--gold)" }}>Paid</span>}
                  {brief.cat === "opencall" && <span className="brief-tag" style={{ background: "rgba(135,206,235,0.12)", borderColor: "rgba(135,206,235,0.25)", color: "#87CEEB" }}>Open Call</span>}
                  {brief.cat === "concept" && <span className="brief-tag" style={{ background: "rgba(212,165,255,0.12)", borderColor: "rgba(212,165,255,0.25)", color: "var(--lavender)" }}>Ideas</span>}
                  {brief.urgent && <span className="brief-tag" style={{ background: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.3)", color: "var(--coral)" }}>Urgent</span>}
                  {brief.nsfw && <span className="brief-tag" style={{ background: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.3)", color: "var(--sunset)" }}>18+</span>}
                </div>
              </div>
              <div className="brief-title">{brief.title}</div>
              {(() => {
                const isLong = (brief.desc || "").length > 160;
                const isExpanded = expandedBriefIds.has(brief.id);
                return (
                  <div
                    className="brief-desc"
                    style={!isLong || isExpanded ? undefined : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  >
                    {brief.desc}
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => setExpandedBriefIds(prev => { const next = new Set(prev); isExpanded ? next.delete(brief.id) : next.add(brief.id); return next; })}
                        style={{ display: "block", marginTop: 4, background: "none", border: "none", padding: 0, color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                );
              })()}
              {brief.cat !== "concept" && (
                // Plain safety reminder (audit finding mm-p2-2 — Torreé chose
                // non-legal microcopy over drafted legal disclaimer language,
                // which needs real legal review, not guessed wording). Shown
                // on tfp/paid/opencall briefs, which are the categories that
                // typically lead to an in-person session; "concept" briefs
                // are idea-exchange threads with no meetup implied yet.
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <span aria-hidden="true">🛈</span> Meet in public places and verify details before attending a session.
                </div>
              )}
              <div className="brief-tags">{brief.tags.map((t: string) => <span key={t} className="brief-tag">{t}</span>)}</div>
              <div className="brief-actions">
                {isOwnBrief(brief) ? (
                  // Own post: no Apply/Book/Respond to yourself — the
                  // applicant count above is the useful signal here instead.
                  <span className="brief-meta-item" style={{ fontStyle: "italic", opacity: 0.7 }}>Your post</span>
                ) : brief.cat === "concept" ? (
                  <button className="brief-btn-apply" style={{ padding: "8px 14px", fontSize: 12 }} onClick={() => { setChatTarget({ id: brief.id, name: brief.author, type: "Creative", img: brief.authorImg, messages: [] }); showScreen("chat"); }}>Respond</button>
                ) : (
                  <button
                    className={"brief-btn-apply" + (appliedBriefs.includes(brief.id) ? " applied" : "")}
                    style={{ padding: "8px 14px", fontSize: 12 }}
                    onClick={async () => {
                      if (!appliedBriefs.includes(brief.id)) {
                        setAppliedBriefs([...appliedBriefs, brief.id]);
                        try {
                          const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "brief-apply", briefId: brief.id }) });
                          if (!r.ok) throw new Error("failed");
                          showToast("Applied!");
                          apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-quest", action_keys: ["apply_brief"] }) }).catch(() => {});
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
                {brief.cat === "paid" && !isOwnBrief(brief) && (
                  <button className="brief-btn-apply" style={{ background: "rgba(212,165,255,0.1)", borderColor: "rgba(212,165,255,0.2)", color: "var(--lavender)", padding: "8px 14px", fontSize: 12 }} onClick={() => { setChatTarget({ id: brief.id, name: brief.author, type: "Creative", img: brief.authorImg, messages: [] }); showScreen("chat"); showToast("Message " + brief.author + " to book this paid brief"); }}>Book</button>
                )}
                <button
                  className={"brief-btn-save" + (savedBriefs.includes(brief.id) ? " saved" : "")}
                  style={{ padding: "8px 14px", fontSize: 12 }}
                  onClick={() => {
                    const isSaved = savedBriefs.includes(brief.id);
                    if (isSaved) {
                      setSavedBriefs(savedBriefs.filter(x => x !== brief.id));
                      showToast("Unsaved");
                    } else {
                      setSavedBriefs([...savedBriefs, brief.id]);
                      showToast("Saved!");
                    }
                    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { savedBriefs: isSaved ? savedBriefs.filter(x => x !== brief.id) : [...savedBriefs, brief.id] } }) }).catch(() => showToast(isSaved ? "Couldn't unsave — try again" : "Couldn't save — try again"));
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
        <div className="modal-overlay" role="presentation" aria-hidden="true" onClick={() => setShowPostBrief(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: "90%", padding: 20 }}>
            <div className="modal-title" style={{ marginBottom: 4 }}>{viewerSide(currentUser?.type) === "industry" ? "Post a Brief — find talent" : "Post a Brief"}</div>
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
            <button className="btn btn-gold" style={{ width: "100%", fontWeight: 700 }} onClick={submitBrief}>{viewerSide(currentUser?.type) === "industry" ? "Post Brief" : "Share It"}</button>
          </div>
        </div>
      )}
      <Nav active="briefs" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default CollabScreen;
