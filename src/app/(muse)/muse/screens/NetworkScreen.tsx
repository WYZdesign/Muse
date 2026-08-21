"use client";

import React, { useState, useMemo, memo } from "react";
import { FiArrowLeft } from "react-icons/fi";
import type { Screen, Match } from "../components/types";
import { PROFESSIONALS, FORUM_POSTS } from "../components/types";
import Nav from "../components/Nav";

export interface NetworkScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  showNsfw: boolean;
  openHamburger: () => void;
  unreadNotificationCount: number;
  matches: Match[];
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string) => void;
  setViewProfile: (p: any) => void;
  currentUser: any;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  openChat: (m: any) => void;
  liveForum: any[] | null;
  showNewPost: boolean;
  setShowNewPost: (v: boolean) => void;
  newPostTitle: string;
  setNewPostTitle: (v: string) => void;
  newPostBody: string;
  setNewPostBody: (v: string) => void;
  setForumPosts: React.Dispatch<React.SetStateAction<any[]>>;
  forumSort: "hot" | "new" | "top";
  setForumSort: (s: "hot" | "new" | "top") => void;
  forumCategory: string;
  uid: () => any;
}

export const NetworkScreen = memo(function NetworkScreen({
  screen,
  showScreen,
  showNsfw,
  openHamburger,
  unreadNotificationCount,
  matches,
  apiFetch,
  showToast,
  setViewProfile,
  currentUser,
  handleImgError,
  openChat,
  liveForum,
  showNewPost,
  setShowNewPost,
  newPostTitle,
  setNewPostTitle,
  newPostBody,
  setNewPostBody,
  setForumPosts,
  forumSort,
  setForumSort,
  forumCategory,
  uid,
}: NetworkScreenProps) {
  const [netTab, setNetTab] = useState<"pros" | "forum">("pros");
  const [flippedId, setFlippedId] = useState<number | null>(null);

  const filteredForum = useMemo(() => {
    return [...(liveForum?.length ? liveForum : FORUM_POSTS)]
      .filter(p => forumCategory === "all" || p.cat === forumCategory)
      .sort((a, b) =>
        forumSort === "top" ? (b.votes + b.comments.length * 2) - (a.votes + a.comments.length * 2) :
        forumSort === "new" ? (b.id - a.id) :
        (b.votes * 2 + b.comments.length) - (a.votes * 2 + a.comments.length)
      );
  }, [liveForum, forumCategory, forumSort]);

  return (
    <div className={"screen-el" + (screen === "network" ? " active" : "")}>
      <div className="hdr">
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <span style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>Network</span>
        <div style={{ width: 36 }} />
      </div>
      <div className="conn-tabs" style={{ padding: "0 16px" }}>
        {(["pros", "forum"] as const).map(t => (
          <div key={t} className={"conn-tab" + (netTab === t ? " active" : "")} onClick={() => setNetTab(t)}>{t === "pros" ? "Professionals" : "Forum"}</div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
        {netTab === "pros" && PROFESSIONALS.filter(p => showNsfw || !p.nsfw).map(p => (
          <div key={p.id} style={{ perspective: 1200, marginBottom: 14 }}>
            <div
              onClick={() => setFlippedId(f => f === p.id ? null : p.id)}
              style={{ position: "relative", width: "100%", minHeight: 380, cursor: "pointer", transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(.4,0,.2,1)", transform: flippedId === p.id ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              {/* FRONT — pic, name, location, badges */}
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", borderRadius: 16, overflow: "hidden" }}>
                <img loading="lazy" src={p.img} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={handleImgError} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(10,6,18,0.88) 0%,rgba(10,6,18,0.25) 55%,rgba(10,6,18,0.1) 100%)" }} />
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{p.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--gold)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>📍 {p.loc}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: "rgba(255,215,0,0.22)", border: "1px solid rgba(255,215,0,0.4)", color: "var(--gold)", fontWeight: 700 }}>{p.type}</span>
                    <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontWeight: 700 }}>{p.exp} exp</span>
                    <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: "rgba(135,206,235,0.2)", border: "1px solid rgba(135,206,235,0.35)", color: "#b7e4f7", fontWeight: 700 }}>{p.openings} openings</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Tap to see details ›</div>
                </div>
              </div>
              {/* BACK — full details on soft gradient */}
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg,#1a0a2e 0%,#2d1b4e 50%,#1a0a2e 100%)", border: "1px solid rgba(255,215,0,0.2)" }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,215,0,0.08),rgba(212,165,255,0.08))" }} />
                <div style={{ position: "relative", padding: "22px", display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{p.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>{p.type}</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gold)" }}>{p.exp}</div>
                      <div style={{ fontSize: 10, color: "var(--text2)" }}>Experience</div>
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gold)" }}>{p.openings}</div>
                      <div style={{ fontSize: 10, color: "var(--text2)" }}>Openings</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 6 }}>Skills</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(p.skills || []).map(s => <span key={s} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 99, background: "rgba(212,165,255,0.15)", border: "1px solid rgba(212,165,255,0.3)", color: "#e6d3ff", fontWeight: 600 }}>{s}</span>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 6 }}>Location</div>
                    <div style={{ fontSize: 14, color: "var(--text)" }}>{p.loc}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12 }}>
                    <button className="btn btn-gold" style={{ flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async (e) => { e.stopPropagation(); try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", targetId: p.id }) }); if (!r.ok) throw new Error("failed"); showToast("Connection request sent to " + p.name + "!"); } catch { showToast("Failed to send connection"); } }}>Connect</button>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={(e) => { e.stopPropagation(); setViewProfile(p); showToast("Viewing " + p.name + "'s profile"); }}>View Profile</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {netTab === "forum" && (
          <>
            {showNewPost && (
              <div className="modal-overlay" style={{ position: "fixed", zIndex: 400 }}>
                <div className="modal-header">
                  <button className="modal-back" onClick={() => setShowNewPost(false)}><FiArrowLeft size={20} /></button>
                  <div className="modal-title">New Post</div>
                  <button className="modal-close" onClick={() => setShowNewPost(false)} aria-label="Close">✕</button>
                </div>
                <div className="modal-body" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <input className="inp" placeholder="Title" value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} style={{ marginBottom: 8 }} />
                  <textarea className="inp" placeholder="What's on your mind?" rows={4} value={newPostBody} onChange={e => setNewPostBody(e.target.value)} style={{ marginBottom: 10, resize: "none" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-gold" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }} onClick={async () => { if (newPostTitle.trim()) { const title = newPostTitle.trim(); const body = newPostBody.trim(); setForumPosts(prev => [{ id: uid(), title, body, author: currentUser.name, avatar: currentUser.avatar, votes: 1, comments: [], cat: "General", time: "Just now", pinned: false }, ...prev]); setNewPostTitle(""); setNewPostBody(""); setShowNewPost(false); try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", title, body, userId: currentUser.id }) }); showToast("Posted!"); } catch { showToast("Failed to post"); } } }}>Post</button>
                    <button className="btn btn-outline" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12 }} onClick={() => setShowNewPost(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 20px 10px" }}>
              <div style={{ display: "flex", gap: 6 }}>{(["hot", "new", "top"] as const).map(s => (<div key={s} className={"conn-tab-sub" + (forumSort === s ? " active" : "")} onClick={() => setForumSort(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>))}</div>
              <button className="conn-btn conn-btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => setShowNewPost(!showNewPost)}>+ Post</button>
            </div>
            {filteredForum.map(post => (
              <div key={post.id} className="conn-card" style={{ flexDirection: "column", marginBottom: 8, padding: 14 }}>
                {post.pinned && <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>📌 Pinned</div>}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 36 }}>
                    <button style={{ background: "none", border: "none", color: post.votes > 0 ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }} onClick={() => setForumPosts(prev => prev.map(p => p.id === post.id ? { ...p, votes: p.votes + 1 } : p))}>▲</button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{post.votes}</span>
                    <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }} onClick={() => setForumPosts(prev => prev.map(p => p.id === post.id ? { ...p, votes: p.votes - 1 } : p))}>▼</button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{post.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>{post.author}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{post.body.slice(0, 120)}{post.body.length > 120 ? "..." : ""}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default NetworkScreen;
