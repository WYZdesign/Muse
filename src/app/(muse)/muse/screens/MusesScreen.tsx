"use client";

import React, { memo, useEffect, useState } from "react";
import { ensureDeviceTiltActive, getDeviceTilt, createSpatialScene } from "../hooks/useDeviceTilt";
import Image from "next/image";
import { FiArrowLeft, FiSearch, FiGrid, FiList } from "react-icons/fi";
import MatchCard from "../components/MatchCard";
import Nav from "../components/Nav";
import UpsellModal from "../components/UpsellModal";
import type { Screen, Match, Profile } from "../components/types";

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
}: MusesScreenProps) {
  // "Likes You" is already blurred/badged for free-tier viewers (the
  // in-context paywall) — this only covers what used to happen on tap: a
  // plain toast instead of a real upsell moment.
  const [showLikesUpsell, setShowLikesUpsell] = useState(false);

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

      {/* Sub-nav tabs: Matches vs Likes You */}
      <div style={{ display: "flex", gap: 6, margin: "0 16px 12px" }}>
        <button
          style={{ flex: 1, padding: "16px 0", borderRadius: 13, border: "none", background: !showLikesYou ? "linear-gradient(135deg,rgba(255,69,0,0.25),rgba(255,215,0,0.15))" : "transparent", color: !showLikesYou ? "var(--gold)" : "var(--text2)", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all .25s", boxShadow: !showLikesYou ? "0 2px 8px rgba(255,69,0,0.15)" : "none" }}
          onClick={() => setShowLikesYou(false)}
        >
          Matches {matches.length > 0 ? `(${matches.length})` : ""}
        </button>
        <button
          style={{ flex: 1, padding: "16px 0", borderRadius: 13, border: "none", background: showLikesYou ? "linear-gradient(135deg,rgba(255,20,147,0.25),rgba(255,105,180,0.15))" : "transparent", color: showLikesYou ? "#FF69B4" : "var(--text2)", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all .25s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: showLikesYou ? "0 2px 8px rgba(255,20,147,0.15)" : "none" }}
          onClick={() => setShowLikesYou(true)}
        >
          <span>♥ Likes You</span>
          {likedBy.length > 0 && (
            <span style={{ padding: "2px 7px", borderRadius: 99, background: "linear-gradient(135deg,var(--coral),var(--pink))", fontSize: 11, fontWeight: 800, color: "#fff" }}>{likedBy.length}</span>
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

      {showLikesYou ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
          <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>People who liked your profile and want to connect</div>
          {likedBy.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px", textAlign: "center" }}>
              <div className="empty-icon" style={{ fontSize: 48, marginBottom: 12 }}>♥</div>
              <div className="empty-title" style={{ fontSize: 18, fontWeight: 800 }}>No likes yet</div>
              <div className="empty-sub" style={{ fontSize: 13, color: "var(--text2)", maxWidth: 260, margin: "6px auto 0" }}>Keep your profile fresh and active — commissions will start flying!</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
              {likedBy.map(p => (
                <div key={p.id} className="muse-likes-card" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (currentUser.tier !== "muse_pro") { setShowLikesUpsell(true); } else { setViewProfile(p); } } }} style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "3/4", cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }} onClick={() => { if (currentUser.tier !== "muse_pro") { setShowLikesUpsell(true); } else { setViewProfile(p); } }}>
                  <Image loading="lazy" src={p.img} alt={p.name} fill sizes="(max-width: 600px) 50vw, 300px" style={{ objectFit: "cover", filter: currentUser.tier !== "muse_pro" ? "blur(4px)" : undefined }} />
                  <div className="muse-likes-info" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 10px", background: "linear-gradient(to top,rgba(10,6,18,0.95) 0%,rgba(10,6,18,0.6) 60%,transparent 100%)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>{p.type}</div>
                  </div>
                  <div style={{ position: "absolute", top: 8, right: 8, padding: "3px 8px", borderRadius: 99, background: "linear-gradient(135deg,var(--coral),var(--pink))", fontSize: 9, fontWeight: 800, color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>♥ Liked You</div>
                  {currentUser.tier !== "muse_pro" && (<div style={{ position: "absolute", top: 8, left: 8, padding: "2px 7px", borderRadius: 99, background: "rgba(0,0,0,0.65)", fontSize: 9, fontWeight: 700, color: "var(--gold)", border: "1px solid rgba(255,215,0,0.3)" }}>PRO</div>)}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="match-list" style={matchesView === "grid" ? { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gridAutoFlow: "row", gridAutoRows: "auto", columnGap: 14, rowGap: 14, alignContent: "flex-start", overflowY: "auto", padding: "14px 14px 112px", boxSizing: "border-box" } : { flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", overflowY: "auto", padding: "0 16px 80px", gap: 10 }}>
          {matches.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px" }}>
              <div className="empty-icon" style={{ fontSize: 56, marginBottom: 12 }}>♥</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap" }}>No commissions yet</div>
              <div style={{ fontSize: 13, color: "var(--text2)", maxWidth: 260, marginTop: 6, lineHeight: 1.5 }}>Swipe right on creatives in Discover to ignite new collaborations.</div>
              <button className="btn btn-gold" style={{ marginTop: 18, padding: "10px 24px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => showScreen("discover")}>Start Discovering</button>
            </div>
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
        feature="See Who Likes You"
        reason={`${likedBy.length > 0 ? likedBy.length + " people" : "People"} liked your profile — go Pro to reveal exactly who and match instantly.`}
        icon="♥"
        currentUser={currentUser}
        showScreen={showScreen}
      />
    </div>
  );
});

export default MusesScreen;
