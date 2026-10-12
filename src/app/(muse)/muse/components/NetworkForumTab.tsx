// Forum tab body for NetworkScreen: new-post composer + sort/search bar +
// post list (vote/expand-comments/share/report/pin). Pure presentational —
// all state and server calls stay in NetworkScreen; this just renders and
// forwards callbacks.
"use client";

import { FiArrowLeft, FiShare2, FiFlag, FiMessageCircle, FiChevronDown, FiChevronUp, FiSearch } from "react-icons/fi";
import type { NetworkForumPost, CurrentUser } from "../page-models";

export interface NetworkForumTabProps {
  showNewPost: boolean;
  setShowNewPost: (v: boolean) => void;
  newPostTrapRef: React.Ref<HTMLDivElement>;
  newPostTitle: string;
  setNewPostTitle: (v: string) => void;
  newPostBody: string;
  setNewPostBody: (v: string) => void;
  onSubmitPost: () => void;
  forumSort: "hot" | "new" | "top";
  setForumSort: (s: "hot" | "new" | "top") => void;
  forumSearch: string;
  setForumSearch: (v: string) => void;
  forumSearchOpen: boolean;
  setForumSearchOpen: (v: boolean) => void;
  filteredForum: NetworkForumPost[];
  expandedPostId: number | null;
  setExpandedPostId: React.Dispatch<React.SetStateAction<number | null>>;
  votedPosts: Record<number, "up" | "down" | null>;
  commentTexts: Record<number, string>;
  setCommentTexts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  currentUser: CurrentUser;
  onVote: (postId: number, direction: "up" | "down") => void;
  onShare: (post: NetworkForumPost) => void;
  onReport: (target: { id: number | string; type: string; name: string }) => void;
  onOpenThread: (postId: number) => void;
  onAddComment: (postId: number) => void;
  onTogglePin: (post: NetworkForumPost) => void;
}

export function NetworkForumTab({
  showNewPost, setShowNewPost, newPostTrapRef, newPostTitle, setNewPostTitle, newPostBody, setNewPostBody,
  onSubmitPost, forumSort, setForumSort, forumSearch, setForumSearch, forumSearchOpen, setForumSearchOpen,
  filteredForum, expandedPostId, setExpandedPostId, votedPosts, commentTexts, setCommentTexts, currentUser,
  onVote, onShare, onReport, onOpenThread, onAddComment, onTogglePin,
}: NetworkForumTabProps) {
  return (
    <>
      {showNewPost && (
        <div ref={newPostTrapRef} className="modal-overlay" role="dialog" aria-modal="true" aria-label="New forum post" style={{ position: "fixed", zIndex: 400 }}>
          <div className="modal-header">
            <button className="modal-back" onClick={() => setShowNewPost(false)} aria-label="Back">
              <FiArrowLeft size={20} />
            </button>
            <div className="modal-title">New Post</div>
            <div style={{ width: 42 }} />
          </div>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <input
              className="inp"
              aria-label="Forum post title"
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
              <button className="btn btn-gold" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }} onClick={onSubmitPost}>
                Post
              </button>
              <button className="btn btn-outline" style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12 }} onClick={() => setShowNewPost(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="conn-tab-sub-scroll" role="tablist" aria-label="Forum sort" style={{ display: "flex", gap: 6, alignItems: "center", margin: "0 20px 10px", flexWrap: "nowrap", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", paddingTop: 10 }}>
        {!forumSearchOpen && (
          <>
            {(["hot", "new", "top"] as const).map((s) => (
              <div
                key={s}
                role="tab"
                aria-selected={forumSort === s}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setForumSort(s); } }}
                className={"conn-tab-sub" + (forumSort === s ? " active" : "")}
                onClick={() => setForumSort(s)}
                style={{ flexShrink: 0 }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
            ))}
          </>
        )}
        {forumSearchOpen && (
          <input
            className="inp search-input"
            aria-label="Search the forum"
            placeholder="Search the forum…"
            value={forumSearch}
            onChange={(e) => setForumSearch(e.target.value)}
            onBlur={() => { if (!forumSearch.trim()) setForumSearchOpen(false); }}
            autoFocus
            style={{ flex: 1, fontSize: 13, margin: 0 }}
          />
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <FiSearch
            size={18}
            style={{ cursor: "pointer", color: forumSearchOpen ? "var(--gold)" : "var(--muted)", flexShrink: 0 }}
            onClick={() => {
              if (forumSearchOpen) {
                if (!forumSearch.trim()) setForumSearch("");
                setForumSearchOpen(false);
              } else {
                setForumSearchOpen(true);
              }
            }}
          />
          <button className="conn-btn conn-btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => setShowNewPost(!showNewPost)}>
            + Post
          </button>
        </div>
      </div>
      {filteredForum
        .filter((post) => {
          const q = forumSearch.trim().toLowerCase();
          if (!q) return true;
          return (
            post.title.toLowerCase().includes(q) ||
            post.body.toLowerCase().includes(q) ||
            post.author.toLowerCase().includes(q)
          );
        })
        .map((post) => (
          <div key={post.id} className="conn-card" style={{ flexDirection: "column", marginBottom: 8, padding: 14 }}>
            {post.pinned && (
              <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>
                {"📌"} Pinned
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44 }}>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: votedPosts[post.id] === "up" ? "#FFD700" : "var(--muted)", cursor: "pointer", fontSize: 18, width: 44, height: 44, padding: 0, transition: "color 0.2s" }}
                  onClick={() => onVote(post.id, "up")}
                >
                  {"▲"}
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{post.votes}</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: votedPosts[post.id] === "down" ? "#ff6b6b" : "var(--muted)", cursor: "pointer", fontSize: 18, width: 44, height: 44, padding: 0, transition: "color 0.2s" }}
                  onClick={() => onVote(post.id, "down")}
                >
                  {"▼"}
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  type="button"
                  style={{ display: "block", width: "100%", minHeight: 44, padding: "4px 0", background: "none", border: "none", textAlign: "left", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4, cursor: "pointer" }}
                  onClick={() => onOpenThread(post.id)}
                >
                  {post.title}
                </button>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
                  {post.author} · {post.time}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
                  {post.body.slice(0, 120)}
                  {post.body.length > 120 ? "..." : ""}
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                  <button
                    style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                    onClick={() => setExpandedPostId((prev) => (prev === post.id ? null : post.id))}
                  >
                    <FiMessageCircle size={13} />
                    {post.comments.length} {post.comments.length === 1 ? "reply" : "replies"}
                    {expandedPostId === post.id ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                  </button>
                  <button
                    style={{ background: "none", border: "1px solid var(--border-subtle)", color: "var(--text2)", fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "3px 10px", borderRadius: 99 }}
                    onClick={() => onShare(post)}
                  >
                    <FiShare2 size={12} /> Share
                  </button>
                  <button
                    style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                    onClick={() => onReport({ id: post.id, type: "forum_post", name: post.author })}
                  >
                    <FiFlag size={12} /> Report
                  </button>
                  {/* Torreé audit (2026-09-16): forum-post-pin was already built and
                      registered server-side (author-or-admin, toggles) but had no
                      caller anywhere — the "📌 Pinned" badge above could never
                      actually appear. Author-gated here client-side to match the
                      server's own check (isAuthor || isAdmin) — an admin pinning
                      someone else's post is a moderation action that belongs in the
                      admin panel, not inline in the public feed, so that half is left
                      for a future ModerationPanel pass rather than exposing a button
                      here that 403s for everyone but the post's own author. */}
                  {post.author === currentUser?.name && (
                    <button
                      style={{ background: "none", border: "none", color: post.pinned ? "var(--gold)" : "var(--text2)", fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                      onClick={() => onTogglePin(post)}
                    >
                      📌 {post.pinned ? "Unpin" : "Pin"}
                    </button>
                  )}
                </div>

                {expandedPostId === post.id && (
                  <div style={{ marginTop: 10, borderTop: "1px solid var(--border-subtle)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {post.comments.length === 0 && (
                      <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                        No comments yet. Be the first to reply.
                      </div>
                    )}
                    {post.comments.map((c, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 12px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", marginBottom: 2 }}>{c.author}</div>
                        <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>{c.text}</div>
                      </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                      <input
                        className="inp"
                        placeholder="Write a reply..."
                        aria-label="Write a reply"
                        value={commentTexts[post.id] || ""}
                        onChange={(e) => setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") onAddComment(post.id); }}
                        style={{ width: "100%", fontSize: 12, padding: "9px 12px", background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 10, color: "var(--text)" }}
                      />
                      <button className="btn btn-gold" style={{ width: "100%", padding: "10px 0", fontSize: 11, fontWeight: 700, borderRadius: 10 }} onClick={() => onAddComment(post.id)}>
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
  );
}
