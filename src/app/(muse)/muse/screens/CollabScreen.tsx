"use client";

import React, { memo, useEffect, useState } from "react";
import Image from "next/image";
import { FiArrowLeft, FiPlus, FiSearch, FiGrid, FiRepeat, FiDollarSign, FiVolume2, FiZap, FiFlag, FiBookmark } from "react-icons/fi";
import { matchesBriefSearch } from "../components/searchMatch";
import Nav from "../components/Nav";
import { EmptyState } from "../components/EmptyState";
import type { Screen, Brief } from "../components/types";
import { BRIEFS } from "../components/types";
import HScroll from "../components/HScroll";
import { viewerSide } from "@/lib/role";
import { ensureDeviceTiltActive, getDeviceTilt } from "../hooks/useDeviceTilt";
import { BadgeInfoModal, type BadgeInfo } from "../components/badgeInfo";

export interface CollabScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  goBack?: () => void;
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
  setShowReport?: (v: boolean) => void;
  setReportTarget?: (t: any) => void;
  demo?: boolean;
}

export const CollabScreen = memo(function CollabScreen({
  screen,
  showScreen,
  goBack,
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
  setShowReport = () => {},
  setReportTarget = () => {},
  demo = false,
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
  const [briefSearchQuery, setBriefSearchQuery] = useState("");
  const [safetyInfoOpen, setSafetyInfoOpen] = useState(false);
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);

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
    <div className={"screen-el" + (screen === "briefs" ? " active" : "")} data-screen="briefs">
      <div className="hdr" style={{ display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="hdr-btn" onClick={() => (goBack ? goBack() : showScreen("discover"))} aria-label="Back"><FiArrowLeft size={18} /></button>
        <div
          className="logo-link"
          style={{
            fontSize: 37.5,
            backgroundImage: "linear-gradient(90deg,#FFB5C2,#FFD700,#D4A5FF,#FFB5C2,#FFD700,#FFB5C2)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            margin: 0,
            padding: 0,
            whiteSpace: "nowrap",
            width: "100%",
            justifySelf: "center",
            display: "block",
            textAlign: "center",
          }}
        >Collab</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="hdr-btn" onClick={() => setShowPostBrief(true)} aria-label="Create Brief"><FiPlus size={18} /></button>
        </div>
      </div>
      {/* Search moved out of the header (Torreé audit): a dedicated search bar
          below the category tabs, with the search button INSIDE the bar. */}
      <div style={{ margin: "0 12px 10px", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px 12px" }}>
        <FiSearch size={14} color="var(--muted)" />
        <input className="inp" placeholder="Describe what you're looking for..." value={briefSearchQuery} onChange={e => setBriefSearchQuery(e.target.value)} style={{ flex: 1, margin: 0, padding: "4px 0", border: "none", background: "transparent", fontSize: 13, color: "var(--text)" }} />
        {briefSearchQuery && <button onClick={() => setBriefSearchQuery("")} aria-label="Clear search" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>}
      </div>
      <HScroll className="conn-tabs" gap={0} style={{ padding: "12px 12px 0", justifyContent: "flex-start" }}>
        {/* Small leading icon per tab (audit finding tu-2) — text-only tabs
            work fine at this row length, but a glance-able icon removes a
            beat of reading for a frequently-tapped row like this one. Kept
            to a plain 11px icon, no extra vertical space taken. */}
        {([["all", "All", FiGrid], ["tfp", "TFP", FiRepeat], ["paid", "Paid", FiDollarSign], ["opencall", "Open Call", FiVolume2], ["concept", "Concept", FiZap]] as const).map(([k, l, Icon]) => (
          <div key={k} className={"conn-tab" + (museCat === k ? " active" : "")} role="tab" aria-selected={museCat === k} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMuseCat(k as any); } }} onClick={() => setMuseCat(k as any)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon size={11} />{l}
          </div>
        ))}
      </HScroll>
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
            ...(liveBriefs?.length ? liveBriefs : (demo ? BRIEFS : [])),
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
                  style={{ position: "absolute", top: 14, left: 14, zIndex: 2, width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "var(--text)", fontSize: 12, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >✕</button>
              )}
              {/* Report flag (Torreé audit): sits in the very top-right corner of
                  the card. The safety-info button moves just left of it. */}
              {!isOwnBrief(brief) && (<button aria-label="Report brief" title="Report" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReport(true); setReportTarget({ id: brief.id, type: "brief", name: brief.author }); }} style={{ position: "absolute", top: 14, right: 14, zIndex: 3, width: 22, height: 22, color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><FiFlag size={14} /></button>)}
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
                  {brief.cat === "tfp" && <span role="button" tabIndex={0} className="brief-tag" onClick={() => setBadgeInfo({ name: "TFP", desc: "Trade for print — this brief offers portfolio/collaboration credit instead of cash payment.", icon: "🔄", color: "var(--mint)" })} style={{ background: "rgba(152,251,152,0.15)", borderColor: "rgba(152,251,152,0.3)", color: "var(--mint)", cursor: "pointer" }}>TFP</span>}
                  {brief.cat === "paid" && <span role="button" tabIndex={0} className="brief-tag" onClick={() => setBadgeInfo({ name: "Paid", desc: "This brief pays — there's a cash budget attached.", icon: "💵", color: "var(--gold)" })} style={{ background: "rgba(255,215,0,0.12)", borderColor: "rgba(255,215,0,0.2)", color: "var(--gold)", cursor: "pointer" }}>Paid</span>}
                  {brief.cat === "opencall" && <span role="button" tabIndex={0} className="brief-tag" onClick={() => setBadgeInfo({ name: "Open Call", desc: "An open call — anyone can submit or audition for this opportunity.", icon: "📣", color: "#87CEEB" })} style={{ background: "rgba(135,206,235,0.12)", borderColor: "rgba(135,206,235,0.25)", color: "#87CEEB", cursor: "pointer" }}>Open Call</span>}
                  {brief.cat === "concept" && <span role="button" tabIndex={0} className="brief-tag" onClick={() => setBadgeInfo({ name: "Ideas", desc: "A concept or idea looking for collaborators to bring it to life — no payment, just creative interest.", icon: "💡", color: "var(--lavender)" })} style={{ background: "rgba(212,165,255,0.12)", borderColor: "rgba(212,165,255,0.25)", color: "var(--lavender)", cursor: "pointer" }}>Ideas</span>}
                  {brief.urgent && <span role="button" tabIndex={0} className="brief-tag" onClick={() => setBadgeInfo({ name: "Urgent", desc: "Time-sensitive — the poster needs someone fast.", icon: "⚡", color: "var(--coral)" })} style={{ background: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.3)", color: "var(--coral)", cursor: "pointer" }}>Urgent</span>}
                  {brief.nsfw && <span role="button" tabIndex={0} className="brief-tag" onClick={() => setBadgeInfo({ name: "18+", desc: "Adult / NSFW content — only shown to verified adults.", icon: "🔞", color: "var(--sunset)" })} style={{ background: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.3)", color: "var(--sunset)", cursor: "pointer" }}>18+</span>}
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
                // Safety info popup (Torreé): the one-line "Meet in public places"
                // microcopy is now a tiny "ⓘ" in the top-left of the card that opens
                // a full, dismissible popup with the complete guidance. Kept terse on
                // the card so it doesn't read as legal boilerplate.
                <button
                  aria-label="Safety info"
                  title="Safety info"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSafetyInfoOpen(true); }}
                  style={{ position: "absolute", top: 14, right: 42, width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--muted)", fontSize: 12, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}
                >ⓘ</button>
              )}
              <div className="brief-tags">{brief.tags.map((t: string) => <span key={t} role="button" tabIndex={0} className="brief-tag" onClick={() => setBadgeInfo({ name: t, desc: "A project tag that helps creatives find this brief.", icon: "🏷", color: "#90caf9" })} style={{ cursor: "pointer" }}>{t}</span>)}</div>
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
                  style={{ padding: 8, fontSize: 16, background: "transparent", border: "none", borderRadius: 0, color: savedBriefs.includes(brief.id) ? "var(--gold)" : "var(--text2)", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}
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
                  <FiBookmark size={16} fill={savedBriefs.includes(brief.id) ? "var(--gold)" : "none"} />
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
      {safetyInfoOpen && (
        <div className="modal-overlay" role="presentation" aria-hidden="true" onClick={() => setSafetyInfoOpen(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: "90%", padding: 22, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Safety at your shoot</div>
              <button onClick={() => setSafetyInfoOpen(false)} aria-label="Close" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
              <p style={{ marginBottom: 10 }}>Your safety comes first on Muse. Before any session:</p>
              <ul style={{ paddingLeft: 18, marginBottom: 12 }}>
                <li>Meet in a public place for a first session.</li>
                <li>Verify the other person's identity and details before attending.</li>
                <li>Share your location and the shoot details with a trusted contact.</li>
                <li>Only agree to content and boundaries you're comfortable with.</li>
                <li>Report any concern — we review every report.</li>
              </ul>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Tap outside or ✕ to close.</p>
            </div>
          </div>
        </div>
      )}
      <BadgeInfoModal info={badgeInfo} onClose={() => setBadgeInfo(null)} />
      <Nav active="briefs" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default CollabScreen;
