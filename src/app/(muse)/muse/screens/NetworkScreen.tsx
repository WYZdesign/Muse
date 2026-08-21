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
          <div key={p.id} className="conn-card" style={{ position: "relative", flexDirection: "column", marginBottom: 14, padding: 0, overflow: "hidden", borderRadius: 16, minHeight: 360 }}>
            <img loading="lazy" src={p.img} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={handleImgError} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(10,6,18,0.85) 0%,rgba(10,6,18,0.2) 60%,rgba(10,6,18,0.1) 100%)" }} />
            <div style={{ position: "relative", zIndex: 1, padding: "160px 20px 20px", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: 360 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{p.name}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--gold)", marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{p.type} · {p.loc}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>{p.exp}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                {(p.skills || []).map(s => <span key={s} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}>{s}</span>)}
              </div>
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <button className="btn btn-gold" style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 700, borderRadius: 10 }} onClick={async () => { try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", targetId: p.id }) }); if (!r.ok) throw new Error("failed"); showToast("Connection request sent to " + p.name + "!"); } catch { showToast("Failed to send connection"); } }}>Connect</button>
                <button style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer" }} onClick={() => { setViewProfile(p); showToast("Viewing " + p.name + "'s profile") }}>View Profile</button>
              </div>
            </div>
          </div>
        ))}
        {netTab === "forum" && (
          <>
            {showNewPost && (
              <div className="conn-card" style={{ flexDirection: "column", padding: 14, marginBottom: 10 }}>
                <input className="inp" placeholder="Title" value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} style={{ marginBottom: 8 }} />
                <textarea className="inp" placeholder="What's on your mind?" rows={3} value={newPostBody} onChange={e => setNewPostBody(e.target.value)} style={{ marginBottom: 10, resize: "none" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { if (newPostTitle.trim()) { const title = newPostTitle.trim(); const body = newPostBody.trim(); setForumPosts(prev => [{ id: uid(), title, body, author: currentUser.name, avatar: currentUser.avatar, votes: 1, comments: [], cat: "General", time: "Just now", pinned: false }, ...prev]); setNewPostTitle(""); setNewPostBody(""); setShowNewPost(false); try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", title, body, userId: currentUser.id }) }); showToast("Posted!"); } catch { showToast("Failed to post"); } } }}>Post</button>
                  <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => setShowNewPost(false)}>Cancel</button>
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
