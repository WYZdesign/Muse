"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft, FiCamera } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";

export interface BtsScreenProps {
  screen: Screen;
  stories: any[];
  setStories: React.Dispatch<React.SetStateAction<any[]>>;
  showScreen: (s: Screen) => void;
  openHamburger: () => void;
  unreadNotificationCount: number;
  showToast: (msg: string) => void;
  setShowStory: (idx: number) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
}

export const BtsScreen = memo(function BtsScreen({
  screen,
  stories,
  setStories,
  showScreen,
  openHamburger,
  unreadNotificationCount,
  showToast,
  setShowStory,
  handleImgError,
  apiFetch,
}: BtsScreenProps) {
  const [revealedNsfw, setRevealedNsfw] = useState<Set<string>>(new Set());
  return (
    <div className={"screen-el" + (screen === "moments" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div
          className="logo-link"
          style={{
            fontSize: 30,
            backgroundImage: "linear-gradient(90deg,#FF1493,#FF69B4,#FFA07A,#FFD700)",
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
          Behind The Scenes
        </div>
        <button className="hdr-btn" style={{ width: 34, height: 34, borderRadius: 10 }} onClick={() => { showScreen("connections"); showToast("Share your BTS moment!"); }} aria-label="Snap moment"><FiCamera size={16} /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 80px" }}>
        <div className="moments-page">
          <div className="moments-hero">
            <h2>Raw Creative Process</h2>
            <p>Unpolished work, WIP experiments, studio setups &amp; candid moments.</p>
          </div>
          <div className="moments-quick-capture" onClick={() => { showScreen("connections"); showToast("Share your moment from the Feed composer!"); }}>
            <div className="moments-quick-capture-icon"><FiCamera size={20} color="#fff" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Snap a Behind-the-Scenes Moment</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Share what you&apos;re currently creating</div>
            </div>
          </div>
          <div className="moments-story-row">
            {stories.slice(0, 8).map((s, i) => (
              <div key={s.id} className="moments-story-item" onClick={() => setShowStory(i)}>
                <div className="moments-story-ring">
                  <img loading="lazy" src={s.img || s.avatar} alt="" onError={handleImgError} />
                </div>
                <span className="moments-story-name">{s.author.split(" ")[0]}</span>
              </div>
            ))}
            {stories.length === 0 && [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="moments-story-item" style={{ opacity: 0.5 }}>
                <div className="moments-story-ring" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                </div>
                <span className="moments-story-name">...</span>
              </div>
            ))}
          </div>
          <div className="moments-tab-row">
            {["All", "Photos", "Videos", "Trending"].map(t => (
              <span key={t} className={"moments-tab" + (t === "All" ? " active" : "")}>{t}</span>
            ))}
          </div>
          <div className="moments-feed">
            {stories.map(s => (
              <div key={s.id} className="moments-card">
                <div className="moments-card-body" style={{ paddingBottom: 8 }}>
                  <div className="moments-card-user">
                    <img loading="lazy" src={s.avatar} alt="" className="moments-card-avatar" onError={handleImgError} />
                    <div>
                      <div className="moments-card-username">{s.author}</div>
                      <div className="moments-card-loc">📍 {s.time}</div>
                    </div>
                  </div>
                  <div className="moments-card-caption">{s.text || "A creative moment captured."}</div>
                </div>
                <div style={{position:"relative",overflow:"hidden"}}>
                  <img loading="lazy" src={s.img || s.avatar} alt="" className="moments-card-img" onError={handleImgError} style={{filter:s.nsfw&&!revealedNsfw.has(String(s.id))?"blur(26px) brightness(0.7)":"none",transition:"filter .3s"}} />
                  {s.nsfw&&!revealedNsfw.has(String(s.id))&&(
                    <button onClick={()=>setRevealedNsfw(prev=>{const n=new Set(prev);n.add(String(s.id));return n;})} style={{position:"absolute",inset:0,zIndex:5,background:"rgba(10,6,18,0.45)",border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer"}}>
                      <div style={{fontSize:24,fontWeight:800,color:"#ff8a80"}}>18+</div>
                      <div style={{fontSize:12,fontWeight:700,color:"#fff",letterSpacing:0.03}}>NSFW content</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>Tap to reveal</div>
                    </button>
                  )}
                </div>
                <div className="moments-card-body" style={{ paddingTop: 10 }}>
                  <div className="moments-card-stats">
                    <button className={"moments-action-btn" + (s.liked ? " liked" : "")} onClick={() => { const newLiked = !s.liked; setStories(prev => prev.map(item => item.id === s.id ? { ...item, liked: newLiked, likes: (item.likes || 0) + (newLiked ? 1 : -1) } : item)); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like-moment", momentId: s.id, liked: newLiked }) }).catch(() => {}); }}>♥ {s.likes || 0}</button>
                    <button className="moments-action-btn" onClick={() => { showScreen("connections"); showToast("Open feed to comment"); }}>💬 {s.comments || 0}</button>
                    <button className="moments-action-btn" onClick={() => { navigator.clipboard?.writeText("https://wyzdesign.com/muse/post/" + s.id); showToast("Moment link copied!"); }}>↗ Share</button>
                  </div>
                </div>
              </div>
            ))}
            {stories.length === 0 && [1, 2, 3].map(i => (
              <div key={i} className="moments-card" style={{ opacity: 0.7 }}>
                <div className="moments-card-img" style={{ background: "linear-gradient(135deg,rgba(255,20,147,0.12),rgba(255,217,61,0.08))", height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <FiCamera size={32} color="rgba(255,255,255,0.35)" />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>No moments yet</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Moments disappear after 24 hours</div>
                </div>
                <div className="moments-card-body">
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>Be the first to post a Moment and light up this feed!</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Nav active="moments" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default BtsScreen;
