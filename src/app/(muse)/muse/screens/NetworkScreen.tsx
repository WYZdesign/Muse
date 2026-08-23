"use client";

import React, { useState, useMemo, memo } from "react";
import {
  FiArrowLeft,
  FiShare2,
  FiMapPin,
  FiBriefcase,
  FiStar,
  FiFlag,
  FiMessageCircle,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
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
  setShowReport?: (v: boolean) => void;
  setReportTarget?: (t: any) => void;
}

const SKILL_COLORS = [
  { bg: "rgba(212,165,255,0.18)", border: "rgba(212,165,255,0.35)", color: "#e6d3ff" },
  { bg: "rgba(100,181,246,0.18)", border: "rgba(100,181,246,0.35)", color: "#90caf9" },
  { bg: "rgba(0,188,212,0.18)", border: "rgba(0,188,212,0.35)", color: "#4dd0e1" },
  { bg: "rgba(255,215,0,0.18)", border: "rgba(255,215,0,0.35)", color: "#ffd54f" },
  { bg: "rgba(129,199,132,0.18)", border: "rgba(129,199,132,0.35)", color: "#a5d6a7" },
  { bg: "rgba(255,138,128,0.18)", border: "rgba(255,138,128,0.35)", color: "#ffab91" },
];

function getSkillColor(i: number) {
  return SKILL_COLORS[i % SKILL_COLORS.length];
}

function generateBio(exp: string, skills: string[]): string {
  const years = parseInt(exp, 10) || 0;
  const main = skills[0] || "creative work";
  if (years >= 10)
    return `A seasoned professional with ${years}+ years in ${main}. Deep expertise across ${skills.join(", ")}. Passionate about pushing creative boundaries.`;
  if (years >= 5)
    return `Experienced in ${main} with ${years} years of hands-on work. Skilled in ${skills.join(", ")}. Always looking for the next challenge.`;
  return `Rising talent in ${main} with ${years} years of practice. Exploring ${skills.join(", ")} and eager to collaborate.`;
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
  setShowReport = () => {},
  setReportTarget = () => {},
}: NetworkScreenProps) {
  const [netTab, setNetTab] = useState<"pros" | "forum">("pros");
  const [proDetail, setProDetail] = useState<any | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<number>>(new Set());
  const [connectLoading, setConnectLoading] = useState<number | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [votedPosts, setVotedPosts] = useState<Record<number, "up" | "down" | null>>({});

  const filteredForum = useMemo(() => {
    return [...(liveForum?.length ? liveForum : FORUM_POSTS)]
      .filter((p) => forumCategory === "all" || p.cat === forumCategory)
      .sort((a, b) =>
        forumSort === "top"
          ? b.votes + b.comments.length * 2 - (a.votes + a.comments.length * 2)
          : forumSort === "new"
            ? b.id - a.id
            : b.votes * 2 + b.comments.length - (a.votes * 2 + a.comments.length)
      );
  }, [liveForum, forumCategory, forumSort]);

  function openProProfile(p: any) {
    setProDetail(p);
  }

  function handleConnect(p: any) {
    if (connectedIds.has(p.id)) return;
    setConnectLoading(p.id);
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", targetId: p.id }),
    })
      .then((r: any) => {
        if (!r.ok) throw new Error("failed");
        setConnectedIds((prev) => {
          const n = new Set(prev);
          n.add(p.id);
          return n;
        });
        showToast(`Request sent \u2014 ${p.name} will be notified`);
      })
      .catch(() => {
        setConnectedIds((prev) => {
          const n = new Set(prev);
          n.add(p.id);
          return n;
        });
        showToast(`Request sent \u2014 ${p.name} will be notified`);
      })
      .finally(() => setConnectLoading(null));
  }

  function handleShare(p: any) {
    const text = `Check out ${p.name} \u2014 ${p.type} on Muse`;
    if (navigator.share) {
      navigator.share({ title: p.name, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")).catch(() => {});
    }
  }

  function handlePostShare(post: any) {
    const text = `${post.title} \u2014 by ${post.author} on Muse Forum`;
    if (navigator.share) {
      navigator.share({ title: post.title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard")).catch(() => {});
    }
  }

  function handleVote(postId: number, direction: "up" | "down") {
    const current = votedPosts[postId];
    setVotedPosts((prev) => ({ ...prev, [postId]: current === direction ? null : direction }));
    setForumPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        let delta = 0;
        if (direction === "up") {
          if (current === "up") delta = -1;
          else if (current === "down") delta = 2;
          else delta = 1;
        } else {
          if (current === "down") delta = 1;
          else if (current === "up") delta = -2;
          else delta = -1;
        }
        return { ...p, votes: p.votes + delta };
      })
    );
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forum", type: "vote", postId, direction }),
    }).catch(() => {});
  }

  function addComment(postId: number) {
    const text = (commentTexts[postId] || "").trim();
    if (!text) return;
    const newComment = { author: currentUser.name || "You", text };
    setForumPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, newComment] }
          : p
      )
    );
    setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forum", type: "reply", postId, text }),
    }).then((r: any) => {
      if (!r.ok) throw new Error("failed");
      showToast("Comment added");
    }).catch(() => {
      setForumPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.filter((c: any) => c !== newComment) }
            : p
        )
      );
      showToast("Failed to post comment");
    });
  }

  return (
    <div className={"screen-el" + (screen === "network" ? " active" : "")}>
      <div
        className="hdr"
        style={{
          background:
            "linear-gradient(135deg,rgba(179,229,252,0.12),rgba(0,188,212,0.08),rgba(100,181,246,0.1))",
          borderBottom: "1px solid rgba(100,181,246,0.15)",
        }}
      >
        <button className="chat-back" onClick={() => showScreen("discover")}>
          <FiArrowLeft size={20} />
        </button>
        <span
          style={{
            fontFamily: "'Playfair Display',serif",
            fontStyle: "italic",
            fontSize: 18,
            fontWeight: 800,
            background: "linear-gradient(90deg,#B3E5FC,#64B5F6,#00BCD4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Network
        </span>
        <div style={{ width: 42 }} />
      </div>

      <div className="conn-tabs" style={{ padding: "0 16px" }}>
        {(["pros", "forum"] as const).map((t) => (
          <div
            key={t}
            className={"conn-tab" + (netTab === t ? " active" : "")}
            onClick={() => setNetTab(t)}
          >
            {t === "pros" ? "Professionals" : "Forum"}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
        {netTab === "pros" &&
          PROFESSIONALS.filter((p) => showNsfw || !p.nsfw).map((p) => (
            <div
              key={p.id}
              onClick={() => openProProfile(p)}
              style={{
                marginBottom: 14,
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                height: 380,
              }}
            >
              <img
                loading="lazy"
                src={p.img}
                alt={p.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={handleImgError}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top,rgba(10,6,18,0.88) 0%,rgba(10,6,18,0.25) 55%,rgba(10,6,18,0.1) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--gold)",
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  <FiBriefcase size={13} /> {p.type}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <FiMapPin size={13} /> {p.loc}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 99,
                      background: "rgba(255,215,0,0.22)",
                      border: "1px solid rgba(255,215,0,0.4)",
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    {p.exp}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 99,
                      background: "rgba(135,206,235,0.2)",
                      border: "1px solid rgba(135,206,235,0.35)",
                      color: "#b7e4f7",
                      fontWeight: 700,
                    }}
                  >
                    {p.openings} openings
                  </span>
                </div>
                {/* BADGES ROW */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {(() => {
                    const badges: { icon: string; label: string; color: string; bg: string; border: string }[] = [];
                    const yrs = parseInt(p.exp, 10) || 0;
                    if (yrs >= 10) badges.push({ icon: "🏅", label: "Pro", color: "#FFD700", bg: "rgba(255,215,0,0.15)", border: "rgba(255,215,0,0.3)" });
                    else if (yrs >= 5) badges.push({ icon: "⭐", label: "Experienced", color: "#FFBF00", bg: "rgba(255,191,0,0.12)", border: "rgba(255,191,0,0.25)" });
                    else badges.push({ icon: "🌱", label: "Rising", color: "#A5D6A7", bg: "rgba(165,214,167,0.12)", border: "rgba(165,214,167,0.25)" });
                    if (p.openings >= 5) badges.push({ icon: "🔥", label: "Hiring", color: "#FF6B6B", bg: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.25)" });
                    if (p.skills?.includes("Fashion") || p.skills?.includes("Editorial")) badges.push({ icon: "👗", label: "Fashion", color: "#F48FB1", bg: "rgba(244,143,177,0.12)", border: "rgba(244,143,177,0.25)" });
                    if (p.skills?.includes("Commercial") || p.skills?.includes("Branding")) badges.push({ icon: "💼", label: "Commercial", color: "#FFCC80", bg: "rgba(255,204,128,0.12)", border: "rgba(255,204,128,0.25)" });
                    if (p.skills?.includes("Music Video") || p.skills?.includes("Film")) badges.push({ icon: "🎬", label: "Film", color: "#EF9A9A", bg: "rgba(239,154,154,0.12)", border: "rgba(239,154,154,0.25)" });
                    if (p.skills?.includes("Fine Art") || p.skills?.includes("Body Art")) badges.push({ icon: "🎨", label: "Fine Art", color: "#CE93D8", bg: "rgba(206,147,216,0.12)", border: "rgba(206,147,216,0.25)" });
                    if (p.skills?.includes("Experimental")) badges.push({ icon: "🧪", label: "Experimental", color: "#80DEEA", bg: "rgba(128,222,234,0.12)", border: "rgba(128,222,234,0.25)" });
                    if (p.skills?.includes("Photography") || p.skills?.includes("Editorial")) badges.push({ icon: "📸", label: "Photo", color: "#90CAF9", bg: "rgba(144,202,249,0.12)", border: "rgba(144,202,249,0.25)" });
                    return badges.slice(0, 5).map((b) => (
                      <span key={b.label} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 99, background: b.bg, border: `1px solid ${b.border}`, color: b.color, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        {b.icon} {b.label}
                      </span>
                    ));
                  })()}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.6)",
                    marginTop: 4,
                  }}
                >
                  Tap to see details ›
                </div>
              </div>
            </div>
          ))}

        {netTab === "forum" && (
          <>
            {showNewPost && (
              <div className="modal-overlay" style={{ position: "fixed", zIndex: 400 }}>
                <div className="modal-header">
                  <button className="modal-back" onClick={() => setShowNewPost(false)}>
                    <FiArrowLeft size={20} />
                  </button>
                  <div className="modal-title">New Post</div>
                  <button className="modal-close" onClick={() => setShowNewPost(false)} aria-label="Close">
                    {"\u2715"}
                  </button>
                </div>
                <div
                  className="modal-body"
                  style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
                >
                  <input
                    className="inp"
                    placeholder="Title"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <textarea
                    className="inp"
                    placeholder="What's on your mind?"
                    rows={4}
                    value={newPostBody}
                    onChange={(e) => setNewPostBody(e.target.value)}
                    style={{ marginBottom: 10, resize: "none" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-gold"
                      style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }}
                      onClick={async () => {
                        if (!newPostTitle.trim()) return;
                        const title = newPostTitle.trim();
                        const body = newPostBody.trim();
                        try {
                          const r = await apiFetch("/api/muse", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "forum", title, body, userId: currentUser.id }),
                          });
                          if (!r.ok) {
                            const d = await r.json().catch(() => ({} as any));
                            showToast(d.code === "SAFETY_BLOCK" ? "Post blocked by safety policy" : "Failed to post");
                            return;
                          }
                          setForumPosts((prev) => [
                            {
                              id: uid(),
                              title,
                              body,
                              author: currentUser.name,
                              avatar: currentUser.avatar,
                              votes: 1,
                              comments: [],
                              cat: "General",
                              time: "Just now",
                              pinned: false,
                            },
                            ...prev,
                          ]);
                          setNewPostTitle("");
                          setNewPostBody("");
                          setShowNewPost(false);
                          showToast("Posted!");
                        } catch {
                          showToast("Failed to post");
                        }
                      }}
                    >
                      Post
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12 }}
                      onClick={() => setShowNewPost(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                margin: "0 20px 10px",
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                {(["hot", "new", "top"] as const).map((s) => (
                  <div
                    key={s}
                    className={"conn-tab-sub" + (forumSort === s ? " active" : "")}
                    onClick={() => setForumSort(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </div>
                ))}
              </div>
              <button
                className="conn-btn conn-btn-primary"
                style={{ fontSize: 12, padding: "6px 14px" }}
                onClick={() => setShowNewPost(!showNewPost)}
              >
                + Post
              </button>
            </div>

            {filteredForum.map((post) => (
              <div
                key={post.id}
                className="conn-card"
                style={{ flexDirection: "column", marginBottom: 8, padding: 14 }}
              >
                {post.pinned && (
                  <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>
                    {"\uD83D\uDCCC"} Pinned
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 36 }}>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: votedPosts[post.id] === "up" ? "#FFD700" : "var(--muted)",
                        cursor: "pointer",
                        fontSize: 18,
                        padding: 0,
                        transition: "color 0.2s",
                      }}
                      onClick={() => handleVote(post.id, "up")}
                    >
                      {"\u25B2"}
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{post.votes}</span>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: votedPosts[post.id] === "down" ? "#ff6b6b" : "var(--muted)",
                        cursor: "pointer",
                        fontSize: 18,
                        padding: 0,
                        transition: "color 0.2s",
                      }}
                      onClick={() => handleVote(post.id, "down")}
                    >
                      {"\u25BC"}
                    </button>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                      {post.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
                      {post.author} · {post.time}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
                      {post.body.slice(0, 120)}
                      {post.body.length > 120 ? "..." : ""}
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text2)",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setExpandedPostId((prev) => (prev === post.id ? null : post.id))
                        }
                      >
                        <FiMessageCircle size={13} />
                        {post.comments.length} {post.comments.length === 1 ? "reply" : "replies"}
                        {expandedPostId === post.id ? (
                          <FiChevronUp size={12} />
                        ) : (
                          <FiChevronDown size={12} />
                        )}
                      </button>
                      <button
                        style={{
                          background: "none",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text2)",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                          padding: "3px 10px",
                          borderRadius: 99,
                        }}
                        onClick={() => handlePostShare(post)}
                      >
                        <FiShare2 size={12} /> Share
                      </button>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff6b6b",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() => { setReportTarget({ id: post.id, type: "forum_post", name: post.author }); setShowReport(true); }}
                      >
                        <FiFlag size={12} /> Report
                      </button>
                    </div>

                    {expandedPostId === post.id && (
                      <div
                        style={{
                          marginTop: 10,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          paddingTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {post.comments.length === 0 && (
                          <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                            No comments yet. Be the first to reply.
                          </div>
                        )}
                        {post.comments.map((c: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              borderRadius: 10,
                              padding: "8px 12px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--text2)",
                                marginBottom: 2,
                              }}
                            >
                              {c.author}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                              {c.text}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <input
                            className="inp"
                            placeholder="Write a reply..."
                            value={commentTexts[post.id] || ""}
                            onChange={(e) =>
                              setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addComment(post.id);
                            }}
                            style={{ flex: 1, fontSize: 12, padding: "8px 12px" }}
                          />
                          <button
                            className="btn btn-gold"
                            style={{
                              padding: "8px 16px",
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 10,
                            }}
                            onClick={() => addComment(post.id)}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ─── PRO DETAIL MODAL ─── */}
      {proDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setProDetail(null)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 480,
              maxHeight: "92vh",
              background: "linear-gradient(135deg,#0d0520,#1a0a2e,#0d0520)",
              borderRadius: "24px 24px 0 0",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <button
              onClick={() => setProDetail(null)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 10,
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 99,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              {"\u2715"}
            </button>

            <div style={{ position: "relative", height: 340, flexShrink: 0 }}>
              <img
                src={proDetail.img}
                alt={proDetail.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={handleImgError}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top,rgba(13,5,32,1) 0%,rgba(13,5,32,0.7) 40%,rgba(13,5,32,0.2) 70%,transparent 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 24,
                  right: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: 6,
                    textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                  }}
                >
                  {proDetail.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--gold)",
                    marginBottom: 4,
                  }}
                >
                  <FiBriefcase size={14} /> {proDetail.type}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <FiMapPin size={13} /> {proDetail.loc}
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 24px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.75)",
                  lineHeight: 1.6,
                }}
              >
                {generateBio(proDetail.exp, proDetail.skills || [])}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "var(--muted)",
                    marginBottom: 8,
                  }}
                >
                  Skills
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(proDetail.skills || []).map((s: string, i: number) => {
                    const sc = getSkillColor(i);
                    return (
                      <span
                        key={s}
                        style={{
                          fontSize: 12,
                          padding: "5px 14px",
                          borderRadius: 99,
                          background: sc.bg,
                          border: `1px solid ${sc.border}`,
                          color: sc.color,
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* BADGES SECTION IN DETAIL MODAL */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 8 }}>
                  Badges
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(() => {
                    const badges: { icon: string; label: string; color: string; bg: string; border: string }[] = [];
                    const yrs = parseInt(proDetail.exp, 10) || 0;
                    if (yrs >= 10) badges.push({ icon: "🏅", label: "Pro", color: "#FFD700", bg: "rgba(255,215,0,0.15)", border: "rgba(255,215,0,0.3)" });
                    else if (yrs >= 5) badges.push({ icon: "⭐", label: "Experienced", color: "#FFBF00", bg: "rgba(255,191,0,0.12)", border: "rgba(255,191,0,0.25)" });
                    else badges.push({ icon: "🌱", label: "Rising", color: "#A5D6A7", bg: "rgba(165,214,167,0.12)", border: "rgba(165,214,167,0.25)" });
                    if (proDetail.openings >= 5) badges.push({ icon: "🔥", label: "Hiring", color: "#FF6B6B", bg: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.25)" });
                    if (proDetail.skills?.includes("Fashion") || proDetail.skills?.includes("Editorial")) badges.push({ icon: "👗", label: "Fashion", color: "#F48FB1", bg: "rgba(244,143,177,0.12)", border: "rgba(244,143,177,0.25)" });
                    if (proDetail.skills?.includes("Commercial") || proDetail.skills?.includes("Branding")) badges.push({ icon: "💼", label: "Commercial", color: "#FFCC80", bg: "rgba(255,204,128,0.12)", border: "rgba(255,204,128,0.25)" });
                    if (proDetail.skills?.includes("Music Video") || proDetail.skills?.includes("Film")) badges.push({ icon: "🎬", label: "Film", color: "#EF9A9A", bg: "rgba(239,154,154,0.12)", border: "rgba(239,154,154,0.25)" });
                    if (proDetail.skills?.includes("Fine Art") || proDetail.skills?.includes("Body Art")) badges.push({ icon: "🎨", label: "Fine Art", color: "#CE93D8", bg: "rgba(206,147,216,0.12)", border: "rgba(206,147,216,0.25)" });
                    if (proDetail.skills?.includes("Experimental")) badges.push({ icon: "🧪", label: "Experimental", color: "#80DEEA", bg: "rgba(128,222,234,0.12)", border: "rgba(128,222,234,0.25)" });
                    if (proDetail.skills?.includes("Photography") || proDetail.skills?.includes("Editorial")) badges.push({ icon: "📸", label: "Photo", color: "#90CAF9", bg: "rgba(144,202,249,0.12)", border: "rgba(144,202,249,0.25)" });
                    if (connectedIds.has(proDetail.id)) badges.push({ icon: "🤝", label: "Connected", color: "#81C784", bg: "rgba(129,199,132,0.12)", border: "rgba(129,199,132,0.25)" });
                    return badges.map((b) => (
                      <span key={b.label} style={{ fontSize: 11, padding: "4px 11px", borderRadius: 99, background: b.bg, border: `1px solid ${b.border}`, color: b.color, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        {b.icon} {b.label}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>
                    {proDetail.exp}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text2)" }}>Experience</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>
                    {proDetail.openings}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text2)" }}>Openings</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>
                    {connectedIds.has(proDetail.id) ? 1 : 0}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text2)" }}>Connected</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    disabled={connectedIds.has(proDetail.id) || connectLoading === proDetail.id}
                    style={{
                      flex: 1,
                      padding: "14px 0",
                      fontSize: 14,
                      fontWeight: 700,
                      borderRadius: 12,
                      border: "none",
                      cursor: connectedIds.has(proDetail.id) || connectLoading === proDetail.id ? "default" : "pointer",
                      background: connectedIds.has(proDetail.id)
                        ? "rgba(255,255,255,0.08)"
                        : "linear-gradient(135deg,var(--coral),var(--gold))",
                      color: connectedIds.has(proDetail.id) ? "var(--text2)" : "#fff",
                      opacity: connectLoading === proDetail.id ? 0.7 : 1,
                      transition: "all 0.3s",
                    }}
                    onClick={() => handleConnect(proDetail)}
                  >
                    {connectedIds.has(proDetail.id)
                      ? "\u2713 Requested"
                      : connectLoading === proDetail.id
                        ? "Sending..."
                        : "Connect"}
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "14px 0",
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 12,
                      border: "1px solid rgba(0,188,212,0.3)",
                      background: "transparent",
                      color: "#00BCD4",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setProDetail(null);
                      showToast(`Opening chat with ${proDetail.name}...`);
                    }}
                  >
                    Message
                  </button>
                </div>
                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "var(--text2)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                  onClick={() => handleShare(proDetail)}
                >
                  <FiShare2 size={14} /> Share Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default NetworkScreen;
