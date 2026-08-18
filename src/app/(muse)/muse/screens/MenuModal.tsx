"use client";

import React, { memo } from "react";
import { FiX, FiArrowLeft, FiUsers, FiCalendar, FiShare2, FiUser, FiSettings, FiStar, FiHeadphones } from "react-icons/fi";
import type { Screen, Match } from "../components/types";
import { COMMUNITIES, EVENTS, SESSIONS, PROFESSIONALS, FORUM_POSTS } from "../components/types";

export interface MenuModalProps {
  showHamburger: boolean;
  setShowHamburger: (v: boolean) => void;
  hamburgerScreen: string;
  setHamburgerScreen: (v: string) => void;
  showScreen: (s: Screen) => void;
  liveCommunities: any[] | null;
  liveEvents: any[] | null;
  showNsfw: boolean;
  rsvpdEvents: number[];
  setRsvpdEvents: React.Dispatch<React.SetStateAction<number[]>>;
  matches: Match[];
  openChat: (m: any) => void;
  setChatTarget: (m: any) => void;
  showToast: (msg: string) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setViewProfile: (p: any) => void;
  currentUser: any;
  showNewPost: boolean;
  setShowNewPost: (v: boolean) => void;
  newPostTitle: string;
  setNewPostTitle: (v: string) => void;
  newPostBody: string;
  setNewPostBody: (v: string) => void;
  setForumPosts: React.Dispatch<React.SetStateAction<any[]>>;
  liveForum: any[] | null;
  forumSort: "hot" | "new" | "top";
  setForumSort: (s: "hot" | "new" | "top") => void;
  expandedPost: any;
  setExpandedPost: (id: any) => void;
  commentText: string;
  setCommentText: (v: string) => void;
  setSupportOpen: (v: boolean) => void;
  doLogoutFull: () => void;
  discoveryPrefs: any;
  setDiscoveryPrefs: React.Dispatch<React.SetStateAction<any>>;
  notifPrefs: Record<string, boolean>;
  setNotifPrefs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setShowNsfw: React.Dispatch<React.SetStateAction<boolean>>;
  blockedUsers: string[];
  setScreen: (s: Screen) => void;
  setShowAgeVerification: (v: boolean) => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  authFetch: (url: string, opts?: any) => Promise<any>;
  uid: () => any;
  authUser: any;
}

const SUPPORT_EMAIL = "info@wyzdesign.com";

export const MenuModal = memo(function MenuModal({
  showHamburger,
  setShowHamburger,
  hamburgerScreen,
  setHamburgerScreen,
  showScreen,
  liveCommunities,
  liveEvents,
  showNsfw,
  rsvpdEvents,
  setRsvpdEvents,
  matches,
  openChat,
  setChatTarget,
  showToast,
  handleImgError,
  setViewProfile,
  currentUser,
  showNewPost,
  setShowNewPost,
  newPostTitle,
  setNewPostTitle,
  newPostBody,
  setNewPostBody,
  setForumPosts,
  liveForum,
  forumSort,
  setForumSort,
  expandedPost,
  setExpandedPost,
  commentText,
  setCommentText,
  setSupportOpen,
  doLogoutFull,
  discoveryPrefs,
  setDiscoveryPrefs,
  notifPrefs,
  setNotifPrefs,
  setShowNsfw,
  blockedUsers,
  setScreen,
  setShowAgeVerification,
  apiFetch,
  authFetch,
  uid,
  authUser,
}: MenuModalProps) {
  if (!showHamburger) return null;

  return (
    <div className="hamburger-overlay" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="hamburger-backdrop" onClick={() => setShowHamburger(false)} />
      <div className="hamburger-panel">
        <div
          className="hamburger-close"
          onClick={() => setShowHamburger(false)}
          role="button"
          aria-label="Close menu"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setShowHamburger(false); }}
        >
          <FiX size={18} />
        </div>
        {!hamburgerScreen ? (
          <>
            <div className="hamburger-title">Menu</div>
            {[
              { key: "community", icon: <FiUsers size={20} />, label: "Community", desc: "Channels, groups & events", grad: "linear-gradient(135deg,#FF8A80,#FF4757,#FFD700)" },
              { key: "sessions", icon: <FiCalendar size={20} />, label: "Sessions", desc: "Bookings & one-on-ones", grad: "linear-gradient(135deg,#E1BEE7,#9C27B0,#FF4081)" },
              { key: "network", icon: <FiShare2 size={20} />, label: "Network", desc: "Professionals & forum", grad: "linear-gradient(135deg,#B3E5FC,#64B5F6,#00BCD4)" },
              { key: "profile", icon: <FiUser size={20} />, label: "Profile", desc: "Edit profile & premium", grad: "linear-gradient(135deg,#FFD700,#FFB5C2,#B388FF)" },
              { key: "settings", icon: <FiSettings size={20} />, label: "Settings", desc: "Preferences, safety & help", grad: "linear-gradient(135deg,#CE93D8,#B388FF,#A5D6A7)" },
              { key: "musepro", icon: <FiStar size={20} />, label: "Muse Pro", desc: "Subscription & premium features", grad: "linear-gradient(135deg,#FFD700,#FFA000,#FF6F00)" },
            ].map(item => (
              <div
                key={item.key}
                className="hamburger-item"
                onClick={() => {
                  if (item.key === "community" || item.key === "sessions" || item.key === "network" || item.key === "musepro") {
                    setShowHamburger(false);
                    showScreen(item.key === "musepro" ? "subscription" : item.key as any);
                  } else {
                    setHamburgerScreen(item.key);
                  }
                }}
              >
                <div className="hamburger-item-icon" style={{ background: item.grad }}>{item.icon}</div>
                <div><div className="hamburger-item-label">{item.label}</div><div className="hamburger-item-desc">{item.desc}</div></div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "12px 0 8px", paddingTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>Legal</div>
              {[{ label: "Terms of Service", href: "/terms" }, { label: "Privacy Policy", href: "/privacy" }, { label: "DMCA / Copyright", href: "/dmca" }, { label: "Community Guidelines", href: "/safety" }].map(l => (
                <a key={l.href} href={l.href} onClick={() => setShowHamburger(false)} style={{ display: "block", padding: "8px 0", fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "color .15s" }} onMouseEnter={e => e.currentTarget.style.color = "#FFD700"} onMouseLeave={e => e.currentTarget.style.color = "var(--text2)"}>{l.label}</a>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="hamburger-back" onClick={() => setHamburgerScreen("")}><FiArrowLeft size={16} /> Back</div>
            {hamburgerScreen === "community" && (
              <div className="conn-scroll">
                <div className="hamburger-title">Community</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>Channels &amp; Groups</div>
                {(liveCommunities?.length ? liveCommunities : COMMUNITIES).filter(c => showNsfw || !c.nsfw).map(c => (
                  <div key={c.id} className="conn-card" style={{ margin: "0 0 10px" }}>
                    <img loading="lazy" src={c.img} alt={c.name} className="conn-avatar" style={{ width: 102, height: 102 }} onError={handleImgError} />
                    <div className="conn-content">
                      <div className="conn-name">{c.name}</div>
                      <div className="conn-meta">{c.members} members · {c.desc}</div>
                      <div className="conn-actions" style={{ marginTop: 8, display: "flex", gap: 8, flexDirection: "column" }}>
                        <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join-community", communityId: c.id }) }); if (!r.ok) throw new Error("failed"); showToast("Joined " + c.name + "!"); } catch { showToast("Failed to join"); } }}>{c.cat === "nsfw" ? "Join (18+)" : "Join"}</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => showToast(c.name + " community opened!")}>Learn</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { navigator.clipboard?.writeText("https://wyzdesign.com/muse/community/" + c.id); showToast("Link copied!"); }}>Share</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px" }}>Events</div>
                {(liveEvents?.length ? liveEvents : EVENTS).filter(e => showNsfw || !e.nsfw).map(ev => (
                  <div key={ev.id} className="conn-card" style={{ flexDirection: "column", margin: "0 0 10px" }}>
                    <div className="conn-name">{ev.title}</div>
                    <div className="conn-meta">{ev.date} · {ev.loc}</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", margin: "4px 0 8px", lineHeight: 1.5 }}>{ev.desc}</div>
                    <div style={{ display: "flex", gap: 8, width: "100%", flexDirection: "column" }}>
                      <button className={"btn " + (rsvpdEvents.includes(ev.id) ? "btn-outline" : "btn-gold")} style={{ width: "100%", padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12 }} onClick={() => { setRsvpdEvents(prev => prev.includes(ev.id) ? prev.filter((x: number) => x !== ev.id) : [...prev, ev.id]); showToast(rsvpdEvents.includes(ev.id) ? "RSVP cancelled" : "RSVP confirmed!"); }}>{rsvpdEvents.includes(ev.id) ? "Going" : "RSVP"}</button>
                      <button className="btn btn-outline" style={{ width: "100%", padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12 }} onClick={() => { navigator.clipboard?.writeText("https://wyzdesign.com/muse/event/" + ev.id); showToast("Event link copied!"); }}>Share</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hamburgerScreen === "sessions" && (
              <div className="conn-scroll">
                <div className="hamburger-title">Sessions</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>One-on-One Sessions</div>
                {SESSIONS.map(s => (
                  <div key={s.id} className="conn-card" style={{ margin: "0 0 10px" }}>
                    <img loading="lazy" src={s.img} alt={s.name} className="conn-avatar" style={{ borderRadius: "50%" }} onError={handleImgError} />
                    <div className="conn-content">
                      <div className="conn-name">{s.name}</div>
                      <div className="conn-meta">{s.type} · {s.rate} · ★ {s.rating}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                        {(s.skills || []).map((sk: string) => <span key={sk} className="conn-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{sk}</span>)}
                      </div>
                      <div className="conn-actions" style={{ marginTop: 8, display: "flex", gap: 8, flexDirection: "column" }}>
                        <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "book-session", sessionId: s.id }) }); if (r.status === 403) { const d = await r.json().catch(() => ({})); if (d.code === "VERIFICATION_REQUIRED") { setShowAgeVerification(true); showToast("Verify your identity to book paid sessions"); return; } } if (!r.ok) throw new Error("failed"); showToast("Session request sent to " + s.name + "!"); } catch { showToast("Failed to book session"); } }}>{s.available ? "Book Session" : "Waitlist"}</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { setViewProfile(s); showToast("Viewing " + s.name + "'s profile"); }}>View Profile</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px" }}>Your Bookings</div>
                {matches.filter(m => m.booked).length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: "var(--muted)", fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                    No bookings yet.<br />Swipe right and book sessions with your matches!
                  </div>
                ) : (
                  matches.filter(m => m.booked).map(m => (
                    <div key={m.id} className="conn-card" style={{ margin: "0 0 10px" }}>
                      <img loading="lazy" src={m.img} alt={m.name} className="conn-avatar" onError={handleImgError} />
                      <div className="conn-content">
                        <div className="conn-name">{m.name}</div>
                        <div className="conn-meta">{m.type} · Booked Session</div>
                        <div className="conn-actions" style={{ marginTop: 8, display: "flex", gap: 8, flexDirection: "column" }}>
                          <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => { setHamburgerScreen(""); setShowHamburger(false); openChat(m); }}>Message</button>
                          <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { setChatTarget(m); showScreen("chat"); }}>Details</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {hamburgerScreen === "network" && (
              <div className="conn-scroll">
                <div className="hamburger-title">Network</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>Creative Professionals</div>
                {PROFESSIONALS.filter(p => showNsfw || !p.nsfw).map(p => (
                  <div key={p.id} className="conn-card" style={{ margin: "0 0 10px", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 0 16px 0", gap: 0 }}>
                    <img loading="lazy" src={p.img} alt={p.name} style={{ width: "100%", height: 150, objectFit: "fill", borderRadius: "16px 16px 0 0" }} onError={handleImgError} />
                    <div className="conn-content" style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" }}>
                      <div className="conn-name">{p.name}</div>
                      <div className="conn-meta">{p.type} · {p.loc} · {p.exp}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, justifyContent: "center" }}>
                        {(p.skills || []).slice(0, 3).map((s: string) => <span key={s} className="conn-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{s}</span>)}
                        {(p.skills || []).length > 3 && <span className="conn-tag" style={{ fontSize: 10, padding: "3px 8px" }}>+{(p.skills || []).length - 3}</span>}
                      </div>
                      <div className="conn-actions" style={{ marginTop: 8, display: "flex", gap: 8, flexDirection: "column" }}>
                        <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", targetId: p.id }) }); if (!r.ok) throw new Error("failed"); showToast("Connection request sent to " + p.name + "!"); } catch { showToast("Failed to send connection"); } }}>Connect</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { setViewProfile(p); showToast("Viewing " + p.name + "'s profile"); }}>View Profile</button>
                        <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => { navigator.clipboard?.writeText("https://wyzdesign.com/muse/pro/" + p.id + "?ref=" + currentUser.name.replace(/\s+/g, "-").toLowerCase()); showToast("Shared " + p.name + "'s profile!"); }}>Share Your Profile</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Forum</span>
                  <button className="conn-btn conn-btn-primary" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => setShowNewPost(!showNewPost)}>+ Post</button>
                </div>
                {showNewPost && (
                  <div className="conn-card" style={{ flexDirection: "column", margin: "0 0 14px" }}>
                    <input className="inp" placeholder="Title" value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} style={{ marginBottom: 8 }} />
                    <textarea className="inp" placeholder="What's on your mind?" rows={3} value={newPostBody} onChange={e => setNewPostBody(e.target.value)} style={{ marginBottom: 10, resize: "none" }} />
                    <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                      <button className="btn btn-gold" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={async () => { if (newPostTitle.trim()) { const title = newPostTitle.trim(); const body = newPostBody.trim(); setForumPosts((prev: any[]) => [{ id: uid(), title, body, author: currentUser.name, avatar: currentUser.avatar, votes: 1, comments: [], cat: "General", time: "Just now", pinned: false }, ...prev]); setNewPostTitle(""); setNewPostBody(""); setShowNewPost(false); try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", title, body, userId: currentUser.id }) }); showToast("Posted!"); } catch { showToast("Failed to post"); } } }}>Post</button>
                      <button className="btn btn-outline" style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12 }} onClick={() => setShowNewPost(false)}>Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{(["hot", "new", "top"] as const).map(s => (<div key={s} className={"conn-tab-sub" + (forumSort === s ? " active" : "")} onClick={() => setForumSort(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>))}</div>
                {[...(liveForum?.length ? liveForum : FORUM_POSTS)].sort((a, b) => forumSort === "top" ? (b.votes + b.comments.length * 2) - (a.votes + a.comments.length * 2) : forumSort === "new" ? (b.id - a.id) : (b.votes * 2 + b.comments.length) - (a.votes * 2 + a.comments.length)).map(post => (
                  <div key={post.id} className="conn-card" style={{ flexDirection: "column", margin: "0 0 10px", padding: "14px 18px" }}>
                    {post.pinned && <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 4 }}>📌 Pinned</div>}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 36 }}>
                        <button style={{ background: "none", border: "none", color: post.votes > 0 ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }} onClick={() => setForumPosts((prev: any[]) => prev.map(p => p.id === post.id ? { ...p, votes: p.votes + 1 } : p))}>▲</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{post.votes}</span>
                        <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0 }} onClick={() => setForumPosts((prev: any[]) => prev.map(p => p.id === post.id ? { ...p, votes: p.votes - 1 } : p))}>▼</button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{post.title}</div>
                        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, marginBottom: 8 }}>{post.body}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
                          <img loading="lazy" src={post.avatar} alt="" style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} /> <span style={{ fontWeight: 600, color: "var(--text)" }}>{post.author}</span>
                          <span>·</span><span>{post.time}</span><span>·</span><span>{post.cat}</span><span>·</span><span>{post.comments.length} replies</span>
                        </div>
                        {expandedPost === post.id && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            {post.comments.map((c: { author: string; text: string }, i: number) => <div key={i} style={{ fontSize: 13, color: "var(--text2)", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><strong style={{ color: "var(--text)" }}>{c.author}</strong>: {c.text}</div>)}
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <input className="inp" placeholder="Reply..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={async e => { if (e.key === "Enter" && commentText.trim()) { const txt = commentText.trim(); setForumPosts((prev: any[]) => prev.map(p => p.id === post.id ? { ...p, comments: [...p.comments, { author: currentUser.name, text: txt }] } : p)); setCommentText(""); try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "reply", postId: post.id, text: txt, userId: currentUser.id }) }); showToast("Reply posted!"); } catch { showToast("Failed to post reply"); } } }} style={{ flex: 1, fontSize: 12, padding: "8px 12px" }} />
                            </div>
                          </div>
                        )}
                        {post.comments.length > 0 && expandedPost !== post.id && <button className="conn-btn conn-btn-ghost" style={{ fontSize: 11, padding: "4px 8px", marginTop: 6 }} onClick={() => { setExpandedPost(post.id === expandedPost ? null : post.id); }}>{post.comments.length} replies</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hamburgerScreen === "profile" && (
              <div className="conn-scroll">
                <div className="hamburger-title" style={{ textAlign: "center" }}>Your Profile</div>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <img loading="lazy" src={currentUser.avatar} alt="You" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--gold)", marginBottom: 10 }} onError={handleImgError} />
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{currentUser.name}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{currentUser.type} · {currentUser.exp}</div>
                </div>
                <button className="hamburger-item" style={{ width: "100%", marginBottom: 6 }} onClick={() => { setHamburgerScreen(""); setShowHamburger(false); setScreen("profile"); }}>
                  <div className="hamburger-item-icon" style={{ background: "linear-gradient(135deg,#FFD700,#FFBF00,#FF8A80)" }}><FiUser size={20} /></div>
                  <div><div className="hamburger-item-label">Edit Profile</div><div className="hamburger-item-desc">Update your bio, skills, portfolio</div></div>
                </button>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px" }}>Muse Premium</div>
                <div style={{ textAlign: "center", padding: 12, marginBottom: 10, background: "linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,138,128,0.06))", borderRadius: 16, border: "1px solid rgba(255,215,0,0.15)" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✨</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>$9.99/month</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10 }}>Unlimited likes, superlikes, boosts &amp; more</div>
                  <button className="btn btn-gold" style={{ fontSize: 12, padding: "8px 20px" }} onClick={async () => { try { let tok = ""; try { const raw = localStorage.getItem("muse_user"); tok = raw ? (JSON.parse(raw).access_token || "") : ""; } catch {} const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { "Authorization": `Bearer ${tok}` } : {}) }, body: JSON.stringify({ type: "subscription", plan: "muse_pro", email: authUser?.email }) }); const d = await r.json(); if (d.url) { window.location.href = d.url; } else { showToast(d.error || "Checkout unavailable, try again later"); } } catch { showToast("Checkout unavailable, try again later"); } }}>Upgrade</button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "20px 0 10px" }}>Statistics</div>
                <div className="stats-row" style={{ marginTop: 8 }}>
                  <div className="stat"><div className="stat-num">{currentUser.stats?.matches || 0}</div><div className="stat-label">Matches</div></div>
                  <div className="stat"><div className="stat-num">{currentUser.stats?.likes || 0}</div><div className="stat-label">Likes</div></div>
                  <div className="stat"><div className="stat-num">{currentUser.stats?.bookingsCompleted || 0}</div><div className="stat-label">Bookings</div></div>
                </div>
                <button className="hamburger-item" style={{ width: "100%", marginBottom: 6, marginTop: 20 }} onClick={() => { setShowHamburger(false); setSupportOpen(true); }}>
                  <div className="hamburger-item-icon" style={{ background: "linear-gradient(135deg,#FFD700,#FFBF00,#FF8A80)" }}><FiHeadphones size={20} /></div>
                  <div><div className="hamburger-item-label">Help &amp; Support</div><div className="hamburger-item-desc">Chat with the Muse assistant</div></div>
                </button>
                <button className="btn btn-gold" style={{ width: "100%", marginTop: 24, fontSize: 12, padding: "12px 0" }} onClick={doLogoutFull}>Log Out</button>
              </div>
            )}
            {hamburgerScreen === "settings" && (
              <div className="conn-scroll">
                <div className="hamburger-title">Settings</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 10px" }}>Discovery Preferences</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Age Range</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", overflow: "hidden" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{discoveryPrefs.ageMin}</span>
                    <input type="range" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e => setDiscoveryPrefs((p: any) => ({ ...p, ageMin: Number(e.target.value) }))} style={{ flex: 1, minWidth: 0, accentColor: "var(--gold)" }} />
                    <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>to</span>
                    <input type="range" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e => setDiscoveryPrefs((p: any) => ({ ...p, ageMax: Number(e.target.value) }))} style={{ flex: 1, minWidth: 0, accentColor: "var(--gold)" }} />
                    <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{discoveryPrefs.ageMax}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Max Distance: {discoveryPrefs.distance} mi</div>
                  <input type="range" min={1} max={100} value={discoveryPrefs.distance} onChange={e => setDiscoveryPrefs((p: any) => ({ ...p, distance: Number(e.target.value) }))} style={{ width: "100%", accentColor: "var(--gold)" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Show Me</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["all", "women", "men", "non-binary"].map(g => (
                      <div key={g} onClick={() => setDiscoveryPrefs((p: any) => ({ ...p, gender: g }))} style={{ padding: "8px 16px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all .25s", background: discoveryPrefs.gender === g ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)", border: "1px solid " + (discoveryPrefs.gender === g ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"), color: discoveryPrefs.gender === g ? "var(--gold)" : "var(--muted)" }}>{g.charAt(0).toUpperCase() + g.slice(1)}</div>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Notification Preferences</div>
                  {[{ k: "match", l: "New Matches" }, { k: "message", l: "Messages" }, { k: "brief", l: "Brief Updates" }, { k: "like", l: "Likes" }].map(n => (
                    <div key={n.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 13, color: "var(--text)" }}>{n.l}</span>
                      <div onClick={() => setNotifPrefs((p: any) => ({ ...p, [n.k]: !p[n.k] }))} style={{ width: 44, height: 24, borderRadius: 12, background: notifPrefs[n.k] ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "all .25s" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: notifPrefs[n.k] ? "var(--gold)" : "var(--muted)", position: "absolute", top: 2, left: notifPrefs[n.k] ? 22 : 2, transition: "all .25s" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-gold" style={{ width: "100%", fontSize: 12 }} onClick={async () => { try { await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: discoveryPrefs }) }); showToast("Preferences saved!"); } catch { showToast("Failed to save"); } }}>Save Preferences</button>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "24px 0 10px" }}>Safety &amp; Privacy</div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Show Distance</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Display your approximate location</div></div>
                  <div onClick={() => setShowNsfw(p => !p)} style={{ width: 44, height: 24, borderRadius: 12, background: showNsfw ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "all .25s" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: showNsfw ? "var(--gold)" : "var(--muted)", position: "absolute", top: 2, left: showNsfw ? 22 : 2, transition: "all .25s" }} />
                  </div>
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Online Status</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Show when you're active</div></div>
                  <div style={{ width: 44, height: 24, borderRadius: 12, background: "rgba(255,215,0,0.3)", cursor: "pointer", position: "relative" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--gold)", position: "absolute", top: 2, left: 22, transition: "all .25s" }} />
                  </div>
                </div>
                <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Blocked Users</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{blockedUsers.length} blocked</div></div>
                </div>
                <button className="btn" style={{ width: "100%", marginTop: 12, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)", fontSize: 13, fontWeight: 700 }} onClick={() => { setShowHamburger(false); showScreen("codex"); }}>📖 The Codex — Badges, Personality &amp; Matching Glossary</button>
                <button className="btn" style={{ width: "100%", marginTop: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text)", fontSize: 13 }} onClick={async () => { try { const res = await authFetch("/api/muse?type=export"); if (!res.ok) { showToast("Export failed"); return; } const j = await res.json(); const blob = new Blob([JSON.stringify(j, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "muse-my-data.json"; a.click(); URL.revokeObjectURL(url); showToast("Data exported"); } catch (e) { showToast("Export failed"); } }}>Export My Data</button>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "24px 0 10px" }}>Help &amp; Support</div>
                {[
                  { q: "How does matching work?", a: "Swipe right on creators you'd like to connect with. If they swipe right back, it's a match! You can then message each other." },
                  { q: "What are Briefs?", a: "Briefs are creative opportunities posted by brands and clients. You can browse open briefs, apply to paid ones, or respond to vision briefs." },
                  { q: "How do I upgrade to Premium?", a: "Go to Settings → Muse Premium to see plan options." },
                  { q: "How do I report someone?", a: "Tap the ••• menu on any profile or post, then select Report. Choose a reason and we'll review it within 24 hours." },
                  { q: "How do I delete my account?", a: "Go to Settings → Safety & Privacy → Delete Account. This permanently removes all your data." },
                ].map((faq, i) => (
                  <div key={i} style={{ marginBottom: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{faq.q}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{faq.a}</div>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-outline" style={{ width: "100%", fontSize: 13 }} onClick={() => window.open("mailto:" + SUPPORT_EMAIL + "?subject=Muse%20Support%20Request")}>Email Support</button>
                </div>
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--coral)", marginBottom: 12 }}>Danger Zone</div>
                  <button className="btn" style={{ width: "100%", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--coral)", fontSize: 13 }} onClick={async () => { if (confirm("Delete your account? This cannot be undone.")) { try { const r = await authFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "delete-account" }) }); if (!r.ok) { showToast("Failed to delete account"); return; } showToast("Account deleted"); setTimeout(() => window.location.reload(), 1500); } catch { showToast("Failed to delete account"); } } }}>Delete Account</button>
                </div>
                <button className="btn btn-gold" style={{ width: "100%", marginTop: 16, fontSize: 12, padding: "12px 0" }} onClick={doLogoutFull}>Log Out</button>
              </div>
            )}
            {hamburgerScreen === "moments" && (
              <div className="conn-scroll">
                <div className="hamburger-title">BTS</div>
                <div style={{ textAlign: "center", padding: 8, fontSize: 13, color: "var(--gold)", fontWeight: 700, marginBottom: 12 }}>Snapshots from creatives near you</div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="conn-card" style={{ flexDirection: "column", margin: "0 0 10px", padding: 0, overflow: "hidden" }}>
                    <div style={{ position: "relative", height: 160, background: `linear-gradient(135deg,${["#FF6B6B", "#4ECDC4", "#FFD93D", "#A78BFA", "#FF8A80", "#6BCB77"][i]},#0a0612)` }}>
                      <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.5)", borderRadius: 99, padding: "4px 10px" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--gold)", border: "2px solid #fff" }} />
                        <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>creative_{100 + i}</span>
                      </div>
                      <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 10, color: "#fff", background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "3px 10px" }}>{["5m", "12m", "28m", "1h", "2h", "3h"][i]} ago</div>
                    </div>
                    <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--text2)" }}>📍 {["Los Angeles", "Miami", "NYC", "Chicago", "Austin", "Portland"][i]}</span>
                      <button className="conn-btn conn-btn-primary" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => showToast("Story viewed!")}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default MenuModal;
