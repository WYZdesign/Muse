"use client";

import React, { memo } from "react";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import MatchCard from "../components/MatchCard";
import Nav from "../components/Nav";
import type { Screen, Match } from "../components/types";

export interface MusesScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  matchesView: "list" | "grid";
  setMatchesView: (v: "list" | "grid" | ((p: "list" | "grid") => "list" | "grid")) => void;
  openChat: (m: any) => void;
  setChatTarget: (m: any) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string) => void;
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
  return (
    <div className={"screen-el" + (screen === "matches" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}>
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
            whiteSpace: "nowrap",
          }}
        >
          Muses
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="hdr-btn" style={{ width: 34, height: 34, borderRadius: 10 }} onClick={() => setSearchOpen(!searchOpen)} aria-label="Search"><FiSearch size={16} /></button>
          <button className="hdr-btn" style={{ width: 34, height: 34, borderRadius: 10, fontSize: 12, fontWeight: 700 }} onClick={() => setMatchesView(v => v === "list" ? "grid" : "list")} aria-label="Toggle view">{matchesView === "list" ? "⊞" : "☰"}</button>
        </div>
      </div>

      {/* Search Bar when active */}
      {searchOpen && (
        <div style={{ margin: "0 16px 12px", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px 12px", animation: "fadeIn .2s ease" }}>
          <FiSearch size={14} color="var(--muted)" />
          <input className="inp" placeholder="Search by name or style..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus style={{ flex: 1, margin: 0, padding: "4px 0", border: "none", background: "transparent", fontSize: 13, color: "var(--text)" }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>}
        </div>
      )}

      <div className="match-list" style={matchesView === "grid" ? { flex: 1, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, alignContent: "flex-start", overflowY: "auto", padding: "8px 16px 80px" } : { flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", overflowY: "auto", padding: "0 0 80px" }}>
        {matches.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px" }}>
            <div className="empty-icon" style={{ fontSize: 56, marginBottom: 12 }}>♥</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap" }}>No sparks yet</div>
            <div style={{ fontSize: 13, color: "var(--text2)", maxWidth: 260, marginTop: 6, lineHeight: 1.5 }}>Swipe right on creatives in Discover to ignite new collaborations.</div>
            <button className="btn btn-gold" style={{ marginTop: 18, padding: "10px 24px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => showScreen("discover")}>Start Discovering</button>
          </div>
        )}
        {matches.filter(m => searchQuery === "" || m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
          <MatchCard key={m.id} m={m} expanded={expandedMatchId === String(m.id)} view={matchesView} actions={matchActions} />
        ))}
      </div>
      <Nav active="matches" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default MusesScreen;
