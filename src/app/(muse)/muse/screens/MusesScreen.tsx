"use client";

import React, { memo, useEffect, useState } from "react";
import { ensureDeviceTiltActive, getDeviceTilt, createSpatialScene } from "../hooks/useDeviceTilt";
import Image from "next/image";
import { FiArrowLeft, FiSearch, FiGrid, FiList } from "react-icons/fi";
import MatchCard from "../components/MatchCard";
import Nav from "../components/Nav";
import UpsellModal from "../components/UpsellModal";
import { EmptyState } from "../components/EmptyState";
import type { Screen, Match, Profile } from "../components/types";
import { isPaidTier } from "../components/subscriptionTiers";

export interface MusesScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  matchesView: "list" | "grid";
  setMatchesView: (v: "list" | "grid" | ((p: "list" | "grid") => "list" | "grid")) => void;
  showLikesYou: boolean;
  setShowLikesYou: (v: boolean | ((p: boolean) => boolean)) => void;
  likedBy: Profile[];
  openChat: (m: any) => void;
  setChatTarget: (m: any) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setViewProfile: (p: any) => void;
  currentUser: any;
  showNsfw: boolean;
  openHamburger?: () => void;
  unreadNotificationCount?: number;
  searchQuery?: string;
  setSearchQuery?: (v: string) => void;
  expandedMatchId?: string | null;
  matchActions?: any;
  messageRequests?: any[];
  setMessageRequests?: React.Dispatch<React.SetStateAction<any[]>>;
}

export const MusesScreen = memo(function MusesScreen({
  screen,
  matches,
  likedBy,
  showLikesYou,
  setShowLikesYou,
  matchesView,
  setMatchesView,
  searchOpen,
  setSearchOpen,
  currentUser,
  showScreen,
  showToast,
  setViewProfile,
  showNsfw,
  setMatches = () => {},
  openChat,
  setChatTarget,
  apiFetch,
  handleImgError,
  openHamburger,
  unreadNotificationCount,
  searchQuery = "",
  setSearchQuery = () => {},
  expandedMatchId = null,
  matchActions,
  messageRequests = [],
  setMessageRequests = () => {},
}: MusesScreenProps) {
  // "Likes You" is already blurred/badged for free-tier viewers (the
  // in-context paywall) — this only covers what used to happen on tap: a
  // plain toast instead of a real upsell moment.
  const [showLikesUpsell, setShowLikesUpsell] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    if (!showLikesYou) return;
    ensureDeviceTiltActive();
    let raf = 0;
    const tick = () => {
      const { x, y } = getDeviceTilt();
      const cards = document.querySelectorAll<HTMLElement>(".muse-likes-card");
      cards.forEach((card) => {
        const img = card.querySelector("img") as HTMLElement | null;
        const info = card.querySelector(".muse-likes-info") as HTMLElement | null;
        card.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
        if (img) img.style.transform = `perspective(800px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) translate(${-x * 15}px, ${-y * 15}px) scale(1.12)`;
        if (info) info.style.transform = `translate(${-x * 15}px, ${-y * 15}px)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showLikesYou]);

  // Main grid view had no tilt/parallax at all — every other primary screen
  // (Discover's swipe card, Network's pro cards) gets this treatment, but
  // Muses' grid cards (.match-card-grid, full-bleed photo like Discover's
  // hero) were skipped, so this page read as "dead" next to the rest of the
  // app. Same spatial-scene engine Discover uses, applied to the grid cards.
  useEffect(() => {
    if (screen !== "matches" || matchesView !== "grid") return;
    return createSpatialScene(
      ".match-card-grid",
      ".match-avatar",
      ".match-info",
      { imgShift: 15, imgRotate: 18, infoShift: 15, containerShift: 8, scale: 1.12 }
    );
  }, [screen, matchesView]);

  return (
    <div className={"screen-el" + (screen === "matches" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div
          className="logo-link"
          style={{
            fontSize: 30,
            backgroundImage: "linear-gradient(90deg,#FF4500,#FFD700,#FFAA00,#FF4500,#FF8C00,#FF4500)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "'Playfair Display',serif",
            fontStyle: "italic",
            fontWeight: 900,
            padding: "0 0.18em",
            display: "inline-block",
            margin: 0,
            whiteSpace: "nowrap",
            animation: "lavaFlow 7s ease-in-out infinite,logoShimmer 4s ease-in-out infinite"
          }}
        >
          Muses
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="hdr-btn" style={{ width: 34, height: 34, borderRadius: 10 }} onClick={() => setSearchOpen(!searchOpen)} aria-label="Search"><FiSearch size={16} /></button>
          {!showLikesYou && (
            <button className="hdr-btn" style={{ width: 34, height: 34, borderRadius: 10 }} onClick={() => setMatchesView(v => v === "list" ? "grid" : "list")} aria-label="Toggle view">{matchesView === "list" ? <FiGrid size={21} /> : <FiList size={21} />}</button>
          )}
        </div>
      </div>

      {/* Sub-nav tabs: Matches vs Likes You vs Requests */}
      <div style={{ display: "flex", gap: 6, margin: "0 16px 12px" }}>
        <button
          style={{ flex: 1, padding: "16px 0", borderRadius: 13, border: "none", background: !showLikesYou && !showRequests ? "linear-gradient(135deg,rgba(255,69,0,0.25),rgba(255,215,0,0.15))" : "transparent", color: !showLikesYou && !showRequests ? "var(--gold)" : "var(--text2)", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all .25s", boxShadow: !showLikesYou && !showRequests ? "0 2px 8px rgba(255,69,0,0.15)" : "none" }}
          onClick={() => { setShowLikesYou(false); setShowRequests(false); }}
        >
          Matches {matches.length > 0 ? `(${matches.length})` : ""}
        </button>
        <button
          style={{ flex: 1, padding: "16px 0", borderRadius: 13, border: "none", background: showLikesYou ? "linear-gradient(135deg,rgba(255,20,147,0.25),rgba(255,105,180,0.15))" : "transparent", color: showLikesYou ? "#FF69B4" : "var(--text2)", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all .25s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: showLikesYou ? "0 2px 8px rgba(255,20,147,0.15)" : "none" }}
          onClick={() => { setShowLikesYou(true); setShowRequests(false); }}
        >
          <span>✦ Interested In You</span>
          {likedBy.length > 0 && (
            <span style={{ padding: "2px 7px", borderRadius: 99, background: "linear-gradient(135deg,var(--coral),var(--pink))", fontSize: 11, fontWeight: 800, color: "#fff" }}>{likedBy.length}</span>
          )}
        </button>
        <button
          style={{ flex: 1, padding: "16px 0", borderRadius: 13, border: "none", background: showRequests ? "linear-gradient(135deg,rgba(0,200,83,0.25),rgba(0,230,118,0.15))" : "transparent", color: showRequests ? "#00E676" : "var(--text2)", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all .25s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: showRequests ? "0 2px 8px rgba(0,200,83,0.15)" : "none" }}
          onClick={() => { setShowLikesYou(false); setShowRequests(true); }}
        >
          <span>Inbox</span>
          {messageRequests.length > 0 && (
            <span style={{ padding: "2px 7px", borderRadius: 99, background: "linear-gradient(135deg,#00C853,#00E676)", fontSize: 11, fontWeight: 800, color: "#fff" }}>{messageRequests.length}</span>
          )}
        </button>
      </div>

      {/* Search Bar when active */}
      {searchOpen && (
        <div style={{ margin: "0 16px 12px", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px 12px", animation: "fadeIn .2s ease" }}>
          <FiSearch size={14} color="var(--muted)" />
          <input className="inp" placeholder="Search by name or style..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus style={{ flex: 1, margin: 0, padding: "4px 0", border: "none", background: "transparent", fontSize: 13, color: "var(--text)" }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} aria-label="Clear search" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>}
        </div>
      )}

      {showRequests ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
          <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>Message requests from people who want to connect</div>
          {messageRequests.length === 0 ? (
            <EmptyState icon="📬" title="No pending requests" sub="When someone messages you for the first time, their request will appear here." style={{ padding: "40px 20px" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messageRequests.map((req: any) => (
                <div key={req.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.06)" }}>
                    {req.from_avatar ? (
                      <img src={req.from_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "var(--muted)" }}>
                        {(req.from_name || "?")[0]}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{req.from_name || "Someone"}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.message_preview || "No message preview"}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 10 }}>{req.time || "Recently"}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={async () => {
                        const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "message-request-accept", requestId: req.id }) });
                        if (r.ok) { setMessageRequests(prev => prev.filter((x: any) => x.id !== req.id)); showToast?.("Request accepted"); }
                      }} style={{ padding: "6px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#00C853,#00E676)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Accept</button>
                      <button onClick={async () => {
                        const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "message-request-decline", requestId: req.id }) });
                        if (r.ok) { setMessageRequests(prev => prev.filter((x: any) => x.id !== req.id)); showToast?.("Request declined"); }
                      }} style={{ padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Decline</button>
                      <button onClick={async () => {
                        const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "message-request-block", requestId: req.id }) });
                        if (r.ok) { setMessageRequests(prev => prev.filter((x: any) => x.id !== req.id)); showToast?.("User blocked"); }
                      }} style={{ padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(255,60,60,0.3)", background: "transparent", color: "#ff6b6b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Block</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : showLikesYou ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
          <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>People who are interested in connecting with you</div>
          {likedBy.length === 0 ? (
            <EmptyState icon="✦" title="No interest yet" sub="Keep your profile fresh and active — connections will start flying!" style={{ padding: "40px 20px" }} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
              {likedBy.map(p => {
                // Audit fix (2026-09-08): was a strict `tier !== "muse_pro"`
                // check, so a muse_studio subscriber (a higher paid tier)
                // saw the same locked/blurred/upsell state as a free user.
                const unlocked = isPaidTier(currentUser.tier);
                return (
                <div key={p.id} className="muse-likes-card" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!unlocked) { setShowLikesUpsell(true); } else { setViewProfile(p); } } }} style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "3/4", cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }} onClick={() => { if (!unlocked) { setShowLikesUpsell(true); } else { setViewProfile(p); } }}>
                  <Image loading="lazy" src={p.img} alt={p.name} fill sizes="(max-width: 600px) 50vw, 300px" style={{ objectFit: "cover", filter: !unlocked ? "blur(4px)" : undefined }} />
                  <div className="muse-likes-info" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 10px", background: "linear-gradient(to top,rgba(10,6,18,0.95) 0%,rgba(10,6,18,0.6) 60%,transparent 100%)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>{p.type}</div>
                  </div>
                  <div style={{ position: "absolute", top: 8, right: 8, padding: "3px 8px", borderRadius: 99, background: "linear-gradient(135deg,var(--coral),var(--pink))", fontSize: 9, fontWeight: 800, color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>✦ Interested</div>
                  {!unlocked && (<div style={{ position: "absolute", top: 8, left: 8, padding: "2px 7px", borderRadius: 99, background: "rgba(0,0,0,0.65)", fontSize: 9, fontWeight: 700, color: "var(--gold)", border: "1px solid rgba(255,215,0,0.3)" }}>PRO</div>)}
                </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="match-list" style={matchesView === "grid" ? { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gridAutoFlow: "row", gridAutoRows: "auto", columnGap: 14, rowGap: 14, alignContent: "flex-start", overflowY: "auto", padding: "14px 14px 112px", boxSizing: "border-box" } : { flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", overflowY: "auto", padding: "0 16px 80px", gap: 10 }}>
          {matches.length === 0 && (
            <EmptyState icon="✦" title="No Muses yet" sub="Swipe right on creatives in Discover to ignite new collaborations.">
              <button className="btn btn-gold" style={{ padding: "10px 24px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => showScreen("discover")}>Start Discovering</button>
            </EmptyState>
          )}
          {matches.filter(m => searchQuery === "" || m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
            <MatchCard key={m.id} m={m} view={matchesView} actions={matchActions} />
          ))}
        </div>
      )}
      <Nav active="matches" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
      <UpsellModal
        open={showLikesYou && showLikesUpsell}
        onClose={() => setShowLikesUpsell(false)}
        feature="See Who's Interested"
        reason={`${likedBy.length > 0 ? likedBy.length + " people" : "People"} are interested in your profile — go Pro to reveal exactly who and connect instantly.`}
        icon="✦"
        currentUser={currentUser}
        showScreen={showScreen}
      />
    </div>
  );
});

export default MusesScreen;
