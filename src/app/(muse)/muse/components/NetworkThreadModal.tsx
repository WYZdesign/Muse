// Reddit-style full thread view (post + nested comments) for NetworkScreen's
// forum tab. Pure presentational — all state lives in NetworkScreen.
"use client";

import { forwardRef } from "react";
import { FiArrowLeft, FiShare2, FiFlag } from "react-icons/fi";
import type { NetworkForumPost, ThreadReply, ThreadReplyNode } from "../page-models";
import type { BadgeInfo } from "./badgeInfo";

export interface NetworkThreadModalProps {
  threadPost: NetworkForumPost;
  threadReplies: Record<string, ThreadReply[]>;
  threadSort: "best" | "new";
  setThreadSort: (s: "best" | "new") => void;
  votedPosts: Record<number, "up" | "down" | null>;
  commentVotes: Record<string, "up" | "down" | null>;
  setCommentVotes: React.Dispatch<React.SetStateAction<Record<string, "up" | "down" | null>>>;
  commentTexts: Record<number, string>;
  setCommentTexts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  replyTo: string | null;
  replyToId: string | null;
  setReplyTo: (v: string | null) => void;
  setReplyToId: (v: string | null) => void;
  onClose: () => void;
  onVote: (postId: number, direction: "up" | "down") => void;
  onShare: (post: NetworkForumPost) => void;
  onReport: (target: { id: number | string; type: string; name: string }) => void;
  onAddComment: (postId: number, parentReplyId?: string | null) => void;
  onBadgeInfo: (info: BadgeInfo | null) => void;
}

export const NetworkThreadModal = forwardRef<HTMLDivElement, NetworkThreadModalProps>(function NetworkThreadModal(
  {
    threadPost, threadReplies, threadSort, setThreadSort, votedPosts, commentVotes, setCommentVotes,
    commentTexts, setCommentTexts, replyTo, replyToId, setReplyTo, setReplyToId, onClose, onVote,
    onShare, onReport, onAddComment, onBadgeInfo,
  },
  ref,
) {
  const tKey = String(threadPost.id);
  const source: ThreadReply[] = threadReplies[tKey]?.length ? threadReplies[tKey] : (threadPost.comments || []);

  const nodes = new Map<string, ThreadReplyNode>();
  source.forEach((r: ThreadReply, i: number) => {
    const rk = r.id != null ? String(r.id) : `idx-${i}`;
    nodes.set(rk, { ...r, __key: rk, children: [] });
  });
  const roots: ThreadReplyNode[] = [];
  nodes.forEach((node) => {
    const pid = node.parentReplyId != null ? String(node.parentReplyId) : null;
    if (pid && nodes.has(pid) && pid !== node.__key) (nodes.get(pid) as ThreadReplyNode).children.push(node);
    else roots.push(node);
  });
  if (threadSort === "new") roots.reverse();

  const renderReply = (node: ThreadReplyNode, level: number): React.ReactNode => {
    const cvKey = `${threadPost.id}:${node.__key}`;
    const cv = commentVotes[cvKey];
    return (
      <div key={node.__key} style={{ marginLeft: Math.min(level, 3) * 16 }}>
        <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),var(--lavender))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "var(--text)" }}>
              {(node.author || "?").charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)" }}>{node.author}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              <button aria-label="Upvote" style={{ background: "none", border: "none", color: cv === "up" ? "#FFD700" : "var(--muted)", cursor: "pointer", fontSize: 12, padding: 0 }} onClick={() => setCommentVotes((p) => ({ ...p, [cvKey]: p[cvKey] === "up" ? null : "up" }))}>▲</button>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{cv === "up" ? 1 : cv === "down" ? -1 : 0}</span>
              <button aria-label="Downvote" style={{ background: "none", border: "none", color: cv === "down" ? "#ff6b6b" : "var(--muted)", cursor: "pointer", fontSize: 12, padding: 0 }} onClick={() => setCommentVotes((p) => ({ ...p, [cvKey]: p[cvKey] === "down" ? null : "down" }))}>▼</button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: 6 }}>{node.text}</div>
          <button
            aria-label={`Reply to ${node.author}`}
            style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}
            onClick={() => {
              setReplyTo(node.author);
              setReplyToId(node.id != null ? String(node.id) : null);
              setCommentTexts((prev) => ({ ...prev, [threadPost.id]: prev[threadPost.id] || `@${node.author} ` }));
            }}
          >
            Reply
          </button>
        </div>
        {node.children.length > 0 && node.children.map((child) => renderReply(child, level + 1))}
      </div>
    );
  };

  return (
    <div ref={ref} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Forum thread" style={{ position: "fixed", zIndex: 500 }}>
      <div className="modal-header">
        <button className="modal-back" onClick={onClose} aria-label="Back">
          <FiArrowLeft size={20} />
        </button>
        <div className="modal-title">Thread</div>
        <div style={{ width: 42 }} />
      </div>
      <div className="modal-body">
        {/* FULL POST */}
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 40, paddingTop: 2 }}>
            <button style={{ background: "none", border: "none", color: votedPosts[threadPost.id] === "up" ? "#FFD700" : "var(--muted)", cursor: "pointer", fontSize: 20, padding: 0 }} onClick={() => onVote(threadPost.id, "up")}>▲</button>
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{threadPost.votes}</span>
            <button style={{ background: "none", border: "none", color: votedPosts[threadPost.id] === "down" ? "#ff6b6b" : "var(--muted)", cursor: "pointer", fontSize: 20, padding: 0 }} onClick={() => onVote(threadPost.id, "down")}>▼</button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {threadPost.cat && (
              <button type="button" onClick={() => onBadgeInfo({ name: threadPost.cat, desc: "The topic category this forum post belongs to.", icon: "🏷", color: "#FFD700" })} style={{ display: "inline-block", minHeight: 44, fontSize: 10, padding: "3px 10px", borderRadius: 99, background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.25)", color: "var(--gold)", fontWeight: 700, marginBottom: 8, cursor: "pointer" }}>{threadPost.cat}</button>
            )}
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1.3, marginBottom: 6 }}>{threadPost.title}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10 }}>{threadPost.author} · {threadPost.time}</div>
            <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{threadPost.body}</div>
            <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
              <button style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 12, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} onClick={() => onShare(threadPost)}>
                <FiShare2 size={13} /> Share
              </button>
              <button style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 12, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} onClick={() => onReport({ id: threadPost.id, type: "forum_post", name: threadPost.author })}>
                <FiFlag size={13} /> Report
              </button>
            </div>
          </div>
        </div>

        {/* COMMENTS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{(() => { const n = threadReplies[String(threadPost.id)]?.length || threadPost.comments.length; return `${n} ${n === 1 ? "comment" : "comments"}`; })()}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["best", "new"] as const).map((s) => (
              <div key={s} role="tab" aria-selected={threadSort === s} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setThreadSort(s); } }} className={"conn-tab-sub" + (threadSort === s ? " active" : "")} onClick={() => setThreadSort(s)} style={{ cursor: "pointer", fontSize: 11, padding: "4px 10px" }}>
                {s === "best" ? "Best" : "New"}
              </div>
            ))}
          </div>
        </div>

        {source.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 12, fontStyle: "italic" }}>
            No comments yet — start the conversation.
          </div>
        ) : (
          roots.map((r) => renderReply(r, 0))
        )}

        {/* COMPOSER */}
        <div style={{ marginTop: 14 }}>
          {replyTo && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, padding: "6px 10px", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--gold)" }}>Replying to @{replyTo}</span>
              <button aria-label="Cancel reply" style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 12 }} onClick={() => { setReplyTo(null); setReplyToId(null); }}>✕</button>
            </div>
          )}
          <input
            className="inp"
            placeholder="Add a comment…"
            aria-label="Add a comment"
            value={commentTexts[threadPost.id] || ""}
            onChange={(e) => setCommentTexts((prev) => ({ ...prev, [threadPost.id]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") onAddComment(threadPost.id, replyToId); }}
            style={{ width: "100%", fontSize: 13, padding: "10px 12px", marginBottom: 8 }}
          />
          <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 10 }} onClick={() => onAddComment(threadPost.id, replyToId)}>
            {replyToId ? "Reply" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
});
