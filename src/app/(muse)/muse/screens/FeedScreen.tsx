"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft, FiImage, FiX, FiMoreHorizontal, FiFlag } from "react-icons/fi";
import Nav from "../components/Nav";
import ScreenSkeleton from "@/components/ScreenSkeleton";
import type { Screen } from "../components/types";

export interface FeedScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  feedFilter: "all" | "photos" | "text" | "videos";
  setFeedFilter: (f: "all" | "photos" | "text" | "videos") => void;
  feedText: string;
  setFeedText: React.Dispatch<React.SetStateAction<string>>;
  feedMedia: string[];
  setFeedMedia: React.Dispatch<React.SetStateAction<string[]>>;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean | ((p: boolean) => boolean)) => void;
  showNewPost: boolean;
  setShowNewPost: (v: boolean) => void;
  newPostTitle: string;
  setNewPostTitle: (v: string) => void;
  newPostBody: string;
  setNewPostBody: (v: string) => void;
  feedPosts: any[];
  setFeedPosts: React.Dispatch<React.SetStateAction<any[]>>;
  currentUser: any;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  authFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  stories: any[];
  setStories: React.Dispatch<React.SetStateAction<any[]>>;
  uploadImage: (file: File, context: string) => Promise<string | null>;
  uid: () => any;
  bootstrapped?: boolean;
  feedPostsStatic?: any[];
  setFeedPostsStatic?: React.Dispatch<React.SetStateAction<any[]>>;
  feedReactions?: Record<string, string[]>;
  replyingTo?: any;
  setReplyingTo?: (id: any) => void;
  commentText?: string;
  setCommentText?: (t: string) => void;
  openHamburger?: () => void;
  unreadNotificationCount?: number;
  setShowReport?: (v: boolean) => void;
  setReportTarget?: (t: any) => void;
  setShareTarget?: (t: any) => void;
}

export const FeedScreen = memo(function FeedScreen({
  screen,
  currentUser,
  feedFilter,
  setFeedFilter,
  feedText,
  setFeedText,
  feedMedia,
  setFeedMedia,
  showEmojiPicker,
  setShowEmojiPicker,
  feedPosts,
  setFeedPosts,
  showScreen,
  showToast,
  uploadImage,
  apiFetch,
  handleImgError,
  stories,
  setStories,
  uid,
  showNewPost = false,
  setShowNewPost = () => {},
  newPostTitle = "",
  setNewPostTitle = () => {},
  newPostBody = "",
  setNewPostBody = () => {},
  bootstrapped = false,
  feedPostsStatic = [],
  setFeedPostsStatic = () => {},
  feedReactions = {},
  replyingTo = null,
  setReplyingTo = () => {},
  commentText = "",
  setCommentText = () => {},
  openHamburger,
  unreadNotificationCount = 0,
  setShowReport = () => {},
  setReportTarget = () => {},
  setShareTarget = () => {},
  authFetch,
}: FeedScreenProps) {
  const [postReplies, setPostReplies] = useState<Record<number, any[]>>({});

  return (
    <div className={"screen-el" + (screen === "connections" ? " active" : "")}>
      <div className="hdr">
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div
          className="logo-link"
          style={{
            fontSize: 32,
            backgroundImage: "linear-gradient(90deg,#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            fontWeight: 800,
            animation: "shimmer 8s ease-in-out infinite",
          }}
        >Feed</div>
        <div style={{ width: 42 }} />
      </div>
      <div className="conn-scroll" style={{ padding: "0 0 80px" }}>
        <div style={{ display: "flex", gap: 6, margin: "0 20px 10px" }}>
          {(["all", "photos", "text"] as const).map(f => (
            <div key={f} className={"conn-tab-sub" + (feedFilter === f ? " active" : "")} onClick={() => setFeedFilter(f)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 99 }}>{f === "all" ? "All" : f === "photos" ? "Photos" : "Text"}</div>
          ))}
        </div>
        <div style={{ margin: "0 20px 12px", padding: "12px 0", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <img loading="lazy" src={currentUser.avatar} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea className="inp" placeholder="Share your work, ideas, or find collaborators..." rows={2} value={feedText} onChange={e => setFeedText(e.target.value)} style={{ resize: "none", margin: 0, minHeight: 52, background: "var(--glass)", border: "1px solid rgba(255,255,255,0.06)" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
              <label style={{ width: 36, height: 36, borderRadius: 10, background: "var(--glass)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: "var(--text2)", flexShrink: 0 }}>
                <FiImage size={16} />
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={async e => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    showToast("Uploading " + files.length + " file(s)...");
                    const urls: string[] = [];
                    for (const f of files) {
                      const url = await uploadImage(f, "feed");
                      if (url) urls.push(url);
                    }
                    setFeedMedia(prev => [...prev, ...urls]);
                  }}
                />
              </label>
              <button style={{ width: 36, height: 36, borderRadius: 10, background: "var(--glass)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: "var(--text2)", flexShrink: 0 }} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
              {feedMedia.slice(0, 1).map((url, i) => (
                <div key={i} style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                  {url.endsWith(".mp4") || url.includes("video") ? (
                    <video src={url} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <img loading="lazy" src={url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                  )}
                  <button onClick={() => setFeedMedia(prev => prev.filter((_, j) => j !== i))} aria-label="Remove media" style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "var(--coral)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><FiX size={10} /></button>
                </div>
              ))}
              <button
                className="btn btn-gold"
                style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 700, borderRadius: 12, whiteSpace: "nowrap" }}
                onClick={async () => {
                  if (feedText.trim() || feedMedia.length) {
                    const txt = feedText.trim();
                    const hasVideo = feedMedia.some(u => u.endsWith(".mp4") || u.includes("video"));
                    const type = feedMedia.length ? (hasVideo ? "video" : "photo") : "text";
                    setFeedText("");
                    setFeedMedia([]);
                    setFeedPosts(prev => [{ id: uid(), author: currentUser.name, avatar: currentUser.avatar, type, text: txt, likes: 0, comments: 0, shares: 0, time: "Just now", img: feedMedia[0] || undefined, media: feedMedia, liked: false, saved: false, reactions: {} }, ...prev]);
                    try {
                      await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feed", text: txt, media: feedMedia, userId: currentUser.id }) });
                      showToast("Posted!");
                    } catch {
                      showToast("Failed to post");
                    }
                  }
                }}
              >
                Post
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, borderRadius: 12, whiteSpace: "nowrap" }}
                onClick={async () => {
                  if (feedText.trim() || feedMedia.length) {
                    const txt = feedText.trim();
                    setFeedText("");
                    setFeedMedia([]);
                    const moment = { id: uid(), author: currentUser.name, avatar: currentUser.avatar, type: feedMedia.length ? "photo" : "text", text: txt, img: feedMedia[0] || undefined, media: [...feedMedia], time: "Just now" };
                    setStories(prev => [moment, ...prev]);
                    try {
                      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-moment", text: txt, img: feedMedia[0] || "" }) });
                      if (!r.ok) throw new Error("failed");
                      showToast("Moment posted!");
                    } catch {
                      setStories(prev => prev.filter(s => s.id !== moment.id));
                      showToast("Failed to post moment — try again");
                    }
                  }
                }}
              >
                BTS
              </button>
            </div>
            {showEmojiPicker && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 0" }}>
                {["😍", "🔥", "❤️", "😂", "😢", "😡", "👍", "🎉", "✨", "💯", "👏", "🙌"].map(emoji => (
                  <span key={emoji} style={{ fontSize: 22, cursor: "pointer", transition: "transform .15s" }} onClick={() => { setFeedText(prev => prev + " " + emoji); setShowEmojiPicker(false); }} onMouseEnter={ev => ev.currentTarget.style.transform = "scale(1.3)"} onMouseLeave={ev => ev.currentTarget.style.transform = "scale(1)"}>{emoji}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        {!bootstrapped ? (
          <ScreenSkeleton rows={4} image />
        ) : feedPosts.length === 0 && feedPostsStatic.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <div className="empty-icon" style={{ fontSize: 48 }}>📝</div>
            <div className="empty-title">No posts yet</div>
            <div className="empty-sub">Be the first to share your creative work!</div>
          </div>
        ) : (
          [...feedPostsStatic, ...feedPosts].sort((a, b) => b.id - a.id).filter(p => feedFilter === "all" || p.type === feedFilter).map(post => {
            const feedReactionArr = feedReactions[post.id] || [];
            const totalReactions = ["❤️", "🔥", "😍", "😂", "😢", "😡"].reduce((s, r) => s + (feedReactionArr.filter(x => x === r).length || 0), (post.liked ? 1 : 0));
            return (
              <div key={post.id} className="conn-card" style={{ flexDirection: "column", margin: "0 20px 14px", padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", gap: 10 }}>
                  <img loading="lazy" src={post.avatar} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} onError={handleImgError} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{post.author}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{post.time}</div>
                  </div>
                  <button style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }} onClick={() => { setShowReport(true); setReportTarget({ id: post.id, type: "feed_post", name: post.author }); }} aria-label="More options"><FiMoreHorizontal size={16} /></button>
                </div>
                <div style={{ padding: "10px 18px", fontSize: 14, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.text}</div>
                {post.img && (
                  <div style={{ position: "relative" }}>
                    <img loading="lazy" src={post.img} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block" }} onError={handleImgError} />
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 18px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {totalReactions > 0 && <span style={{ fontSize: 13, color: "var(--text2)" }}>{totalReactions}</span>}
                    {(["❤️", "🔥", "😍", "😂", "😢", "😡"] as const).map(r => {
                      const rc = feedReactionArr.filter(x => x === r).length;
                      return rc > 0 ? <span key={r} style={{ fontSize: 15 }} title={rc + " reactions"}>{r}</span> : null;
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {post.comments > 0 && (
                      <span style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }} onClick={() => {
                        if (replyingTo !== post.id) setReplyingTo(post.id);
                      }}>
                        {post.comments} comments{(postReplies[post.id]?.length || 0) > 0 ? ` · ${postReplies[post.id].length} shown` : ""}
                      </span>
                    )}
                    {post.shares > 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>{post.shares} shares</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <button className={"feed-action-btn" + (post.liked ? " liked-pop" : "")} style={{ flex: 1.25, height: 42, background: post.liked ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.04)", border: post.liked ? "1.5px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.08)", color: post.liked ? "#ff5c5c" : "#ff8a8a", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, transition: "all .2s ease" }} onClick={() => { const newLiked = !post.liked; setFeedPosts(prev => prev.map(p => p.id === post.id ? ({ ...p, liked: newLiked }) : p)); if (feedPostsStatic.some(p => p.id === post.id)) setFeedPostsStatic(prev => prev.map(p => p.id === post.id ? ({ ...p, liked: newLiked }) : p)); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like-feed-post", postId: post.id, liked: newLiked }) }).then(r => { if (!r.ok) throw new Error("failed"); }).catch(() => { setFeedPosts(prev => prev.map(p => p.id === post.id ? ({ ...p, liked: !newLiked }) : p)); if (feedPostsStatic.some(p => p.id === post.id)) setFeedPostsStatic(prev => prev.map(p => p.id === post.id ? ({ ...p, liked: !newLiked }) : p)); showToast("Failed to update like"); }); }}>♥ {post.likes + (post.liked ? 1 : 0)}</button>
                  <button className="feed-action-btn" style={{ flex: 1.25, height: 42, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#87CEEE", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, transition: "all .2s ease" }} onClick={() => {
                    if (replyingTo !== post.id && !postReplies[post.id]) {
                      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "get-replies", postId: post.id }) })
                        .then((r: any) => r.json?.()).then((data: any) => {
                          if (data?.replies?.length) setPostReplies(prev => ({ ...prev, [post.id]: data.replies }));
                        }).catch(() => {});
                    }
                    setReplyingTo(replyingTo === post.id ? null : post.id);
                  }}>💬 {post.comments}</button>
                  <button className="feed-action-btn" style={{ flex: 0.9, height: 42, background: "transparent", border: "none", color: "#ff8a8a", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, transition: "all .2s ease" }} onClick={() => { setShowReport(true); setReportTarget({ id: post.id, type: "feed_post", name: post.author }); }}>⚑ Report</button>
                </div>
                {replyingTo === post.id && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    {(postReplies[post.id] || []).map((reply: any, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <img loading="lazy" src={reply.avatar || currentUser.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={handleImgError} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{reply.author || "User"}</div>
                          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{reply.text}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{reply.time || "Just now"}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 16px 14px" }}>
                      <input
                          className="inp"
                          placeholder="Write a reply..."
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={async e => { if (e.key === "Enter" && commentText.trim()) { const txt = commentText.trim(); setFeedPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments: p.comments + 1 } : p)); setPostReplies(prev => ({ ...prev, [post.id]: [...(prev[post.id] || []), { author: currentUser.name, avatar: currentUser.avatar, text: txt, time: "Just now" }] })); setCommentText(""); try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "reply", postId: post.id, text: txt }) }); if (!r.ok) throw new Error("failed"); showToast("Reply posted!"); } catch { setFeedPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments: Math.max(0, p.comments - 1) } : p)); setPostReplies(prev => ({ ...prev, [post.id]: (prev[post.id] || []).filter((r: any) => !(r.text === txt && r.author === currentUser.name)) })); showToast("Failed to post reply"); } } }}
                          style={{ width: "100%", margin: 0, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)" }}
                        />
                        <button
                          onClick={async () => { if (commentText.trim()) { const txt = commentText.trim(); setFeedPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments: p.comments + 1 } : p)); setPostReplies(prev => ({ ...prev, [post.id]: [...(prev[post.id] || []), { author: currentUser.name, avatar: currentUser.avatar, text: txt, time: "Just now" }] })); setCommentText(""); try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "reply", postId: post.id, text: txt }) }); if (!r.ok) throw new Error("failed"); showToast("Reply posted!"); } catch { setFeedPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments: Math.max(0, p.comments - 1) } : p)); setPostReplies(prev => ({ ...prev, [post.id]: (prev[post.id] || []).filter((r: any) => !(r.text === txt && r.author === currentUser.name)) })); showToast("Failed to post reply"); } } }}
                          style={{ width: "100%", height: 38, borderRadius: 10, border: "none", background: commentText.trim() ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.06)", color: commentText.trim() ? "#fff" : "rgba(255,255,255,0.25)", fontWeight: 700, fontSize: 12, cursor: commentText.trim() ? "pointer" : "default", transition: "all .2s" }}
                        >Post</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <Nav active="connections" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default FeedScreen;
