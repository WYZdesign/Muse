"use client";

import React, { memo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiArrowLeft, FiImage, FiX, FiFlag, FiSend } from "react-icons/fi";
import { ensureDeviceTiltActive, getDeviceTilt } from "../hooks/useDeviceTilt";
import Nav from "../components/Nav";
import ScreenSkeleton from "@/components/ScreenSkeleton";
import type { Screen } from "../components/types";

export interface FeedScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  feedFilter: "all" | "photos" | "text" | "videos" | "bts";
  setFeedFilter: (f: "all" | "photos" | "text" | "videos" | "bts") => void;
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
  liveFeed?: any[] | null;
  setLiveFeed?: React.Dispatch<React.SetStateAction<any[] | null>>;
  currentUser: any;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  authFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
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
  setViewProfile?: (p: any) => void;
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
  liveFeed = null,
  setLiveFeed,
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
  setViewProfile = () => {},
  authFetch,
}: FeedScreenProps) {
  const [postReplies, setPostReplies] = useState<Record<number, any[]>>({});
  const [detailPostId, setDetailPostId] = useState<number | null>(null);

  // Real posts fetched from the DB (liveFeed) are the source of truth once
  // present; feedPostsStatic (hardcoded demo posts) is only a placeholder
  // for an otherwise-empty feed — same fallback pattern NetworkScreen
  // already uses for liveForum vs FORUM_POSTS. feedPosts holds posts
  // created this session that may not be in `liveFeed` yet (it's only
  // fetched once, on mount) — matched out by author+text so a just-created
  // post doesn't also render as its own separate DB copy once liveFeed has
  // caught up (e.g. after a reload).
  const hasLiveFeed = !!(liveFeed && liveFeed.length);
  const baseFeed = hasLiveFeed ? (liveFeed as any[]) : feedPostsStatic;
  const visibleLocalPosts = hasLiveFeed
    ? feedPosts.filter(lp => !(liveFeed as any[]).some(rp => rp.author === lp.author && (rp.text || "") === (lp.text || "")))
    : feedPosts;
  // A single numeric sort key across demo posts (tiny hardcoded ids),
  // locally-created posts (uid()'s epoch-scale ids), and real DB posts
  // (UUID ids, not sortable by subtraction — use their createdAt instead).
  const sortKey = (p: any) => typeof p.createdAt === "number" ? p.createdAt : p.id;
  const allFeedPosts = [...baseFeed, ...visibleLocalPosts].sort((a, b) => sortKey(b) - sortKey(a));

  // Like/comment optimistic updates need to land in whichever state array
  // actually holds the post — `liveFeed` for a real DB post, `feedPosts`
  // for a locally-created one (feedPostsStatic's demo posts are handled by
  // their own separate isStatic branch at each call site).
  const isLivePost = (id: any) => hasLiveFeed && (liveFeed as any[]).some(p => p.id === id);
  const updateFeedPostState = (postId: any, updater: (p: any) => any) => {
    if (isLivePost(postId)) {
      setLiveFeed?.(prev => (prev || []).map(p => p.id === postId ? updater(p) : p));
    } else {
      setFeedPosts(prev => prev.map(p => p.id === postId ? updater(p) : p));
    }
  };

  useEffect(() => {
    if (screen !== "connections") return;
    ensureDeviceTiltActive();
    let raf = 0;
    const tick = () => {
      const { x, y } = getDeviceTilt();
      const wraps = document.querySelectorAll<HTMLElement>(".feed-post-img-wrap");
      wraps.forEach((wrap) => {
        const img = wrap.querySelector(".feed-post-img") as HTMLElement | null;
        wrap.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
        if (img) img.style.transform = `perspective(800px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) translate(${-x * 15}px, ${-y * 15}px) scale(1.12)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  const openAuthorProfile = (p: { id?: any; name?: string; avatar?: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewProfile({ id: p.id ?? p.name, name: p.name, img: p.avatar, type: "Creative" });
  };

  // ── Camera capture (photo + video) → posts to Feed AND Moments ──
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [camMode, setCamMode] = useState<"photo" | "video">("photo");
  const [camError, setCamError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [capturing, setCapturing] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };
  const closeCamera = () => {
    try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch {}
    recorderRef.current = null;
    setRecording(false); setRecSecs(0);
    stopStream();
    setCameraOpen(false);
    setCamError("");
  };
  useEffect(() => { if (!cameraOpen) return; return () => stopStream(); }, [cameraOpen]);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const openCamera = async (mode: "photo" | "video") => {
    setCamMode(mode);
    setCameraOpen(true);
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1080 } }, audio: mode === "video" });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
    } catch (err: any) {
      setCamError(err?.name === "NotAllowedError" ? "Camera access denied — allow it in your browser settings" : err?.name === "NotFoundError" ? "No camera found on this device" : "Couldn't start the camera");
    }
  };

  const handleCaptured = async (blob: Blob, kind: "image/jpeg" | "video/webm") => {
    if (!blob.size) { showToast("Capture failed — try again"); return; }
    setCapturing(true);
    showToast(kind === "video/webm" ? "Uploading clip…" : "Uploading photo…");
    try {
      const isVid = kind === "video/webm";
      const file = new File([blob], `bts-${Date.now()}.${isVid ? "webm" : "jpg"}`, { type: kind });
      const url = await uploadImage(file, "feed");
      if (!url) throw new Error("upload failed");
      const type = isVid ? "video" : "photo";
      // FEED
      setFeedPosts(prev => [{ id: uid(), author: currentUser.name, avatar: currentUser.avatar, type, text: "", likes: 0, comments: 0, shares: 0, views: 0, time: "Just now", img: url, media: [url], liked: false, saved: false, reactions: {}, isBts: true }, ...prev]);
      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feed", text: "", media: [url], userId: currentUser.id }) }).catch(() => {
        showToast("Went to BTS, but Feed sync failed");
      });
      // BTS
      const momentId = uid();
      setStories(prev => [{ id: momentId, author: currentUser.name, avatar: currentUser.avatar, type, text: "", img: url, media: [url], time: "Just now" }, ...prev]);
      try {
        const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-moment", text: "", img: url }) });
        if (!r.ok) throw new Error("failed");
        showToast("Shared to Feed & BTS ✨");
        apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-quest", action_keys: ["create_moment", "post_bts"] }) }).catch(() => {});
      } catch {
        setStories(prev => prev.filter(s => s.id !== momentId));
        showToast("Went to your Feed, but BTS sync failed");
      }
      closeCamera();
    } catch {
      showToast("Upload failed — check connection and retry");
    } finally { setCapturing(false); }
  };

  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) { showToast("Camera still warming up…"); return; }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob(b => b && handleCaptured(b, "image/jpeg"), "image/jpeg", 0.92);
  };

  const toggleRecord = () => {
    if (!streamRef.current) return;
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
    if (!mime || typeof MediaRecorder === "undefined") { showToast("Video recording isn't supported in this browser"); return; }
    try {
      const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = e => { if ((e as any).data?.size) chunksRef.current.push((e as any).data); };
      rec.onstop = () => {
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        recorderRef.current = null;
        if (blob.size) handleCaptured(blob, "video/webm");
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecSecs(0);
      setTimeout(() => { try { if (recorderRef.current === rec && rec.state !== "inactive") rec.stop(); } catch {} }, 30000);
    } catch {
      showToast("Couldn't start recording");
    }
  };

  const openPostDetail = (id: number) => {
    setDetailPostId(id);
    if (!postReplies[id]) {
      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "get-replies", postId: id }) })
        .then((r: any) => r.json?.())
        .then((data: any) => { if (data?.replies?.length) setPostReplies(prev => ({ ...prev, [id]: data.replies })); })
        .catch(() => {});
    }
  };

  return (
    <div className={"screen-el" + (screen === "connections" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
        <button className="chat-back" onClick={() => showScreen("discover")}><FiArrowLeft size={20} /></button>
        <div
          className="logo-link"
          style={{
            fontSize: 30,
            backgroundImage: "linear-gradient(90deg,#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF)",
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
        >Feed</div>
        <div style={{ width: 42 }} />
      </div>
      <div className="conn-scroll" style={{ padding: "0 0 80px" }}>
        <div className="conn-tab-sub-scroll feed-filter-scroll" style={{ display: "flex", gap: 6, margin: "0 20px 10px", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
          {([
            { k: "all", l: "All", icon: "" },
            { k: "photos", l: "Photos", icon: "📸" },
            { k: "text", l: "Text", icon: "✍️" },
            { k: "videos", l: "Videos", icon: "🎬" },
            { k: "bts", l: "BTS", icon: "🎥" },
          ] as const).map(f => (
            <div key={f.k} className={"conn-tab-sub" + (feedFilter === f.k ? " active" : "")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFeedFilter(f.k as any); } }} onClick={() => setFeedFilter(f.k as any)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
              {f.icon && <span style={{ fontSize: 12 }}>{f.icon}</span>}
              {f.l}
            </div>
          ))}
        </div>
        <div style={{ margin: "0 20px 12px", padding: "12px 0", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <img loading="lazy" src={currentUser.avatar} alt="Avatar" className="feed-avatar" style={{ width: 52, height: 52, flexShrink: 0 }} onError={handleImgError} />
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
                    <img loading="lazy" src={url} alt="Photo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
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
                    setFeedPosts(prev => [{ id: uid(), author: currentUser.name, avatar: currentUser.avatar, type, text: txt, likes: 0, comments: 0, shares: 0, views: 0, time: "Just now", img: feedMedia[0] || undefined, media: feedMedia, liked: false, saved: false, reactions: {}, isBts: hasVideo }, ...prev]);
                    try {
                      await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feed", text: txt, media: feedMedia, userId: currentUser.id }) });
                      showToast("Posted!");
                      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-quest", action_key: "post_feed" }) }).catch(() => {});
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
                onClick={() => openCamera("photo")}
              >
                📷 BTS
              </button>
            </div>
            {showEmojiPicker && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 0" }}>
                {["😍", "🔥", "❤️", "😂", "😢", "😡", "👍", "🎉", "✨", "💯", "👏", "🙌"].map(emoji => (
                  <span key={emoji} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFeedText(prev => prev + " " + emoji); setShowEmojiPicker(false); } }} style={{ fontSize: 22, cursor: "pointer", transition: "transform .15s" }} onClick={() => { setFeedText(prev => prev + " " + emoji); setShowEmojiPicker(false); }} onMouseEnter={ev => ev.currentTarget.style.transform = "scale(1.3)"} onMouseLeave={ev => ev.currentTarget.style.transform = "scale(1)"}>{emoji}</span>
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
          [...feedPostsStatic, ...feedPosts].sort((a, b) => b.id - a.id).filter(p => feedFilter === "all" || (feedFilter === "bts" ? (p.isBts || p.type === "video" && !p.text) : p.type === feedFilter)).map(post => {
            const feedReactionArr = feedReactions[post.id] || [];
            const totalReactions = ["❤️", "🔥", "😍", "😂", "😢", "😡"].reduce((s, r) => s + (feedReactionArr.filter(x => x === r).length || 0), (post.liked ? 1 : 0));
            // Views: approximation if backend doesn't supply a `views` field yet.
            //   baseline 50 + likes*8 (each liker viewed it ~1-12 times) + comments*15 + shares*25
            const views = typeof post.views === "number"
              ? post.views
              : 50 + (post.likes || 0) * 8 + (post.comments || 0) * 15 + (post.shares || 0) * 25;
            // Engagement: weighted (likes=1, comments=2, shares=3, reactions=1) — Twitter/X style.
            const engagement = (post.likes || 0) + (post.comments || 0) * 2 + (post.shares || 0) * 3 + totalReactions;
            const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K" : String(n);
            const isOnline = post.online === true || (post.lastSeen && (Date.now() - new Date(post.lastSeen).getTime() < 5 * 60 * 1000));
            return (
              <div key={post.id} className="conn-card" style={{ flexDirection: "column", margin: "0 20px 14px", padding: 0, overflow: "hidden", position: "relative" }}>
                <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPostDetail(post.id); } }} onClick={() => openPostDetail(post.id)}>
                   <div style={{ position: "relative", flexShrink: 0 }}>
                     <img loading="lazy" src={post.avatar} alt={`${post.author}'s avatar`} className="feed-avatar" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onError={handleImgError} onClick={(e) => openAuthorProfile({ id: post.rid || post.id, name: post.author, avatar: post.avatar }, e)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setViewProfile({ id: post.rid || post.id, name: post.author, img: post.avatar, type: "Creative" }); } }} />
                     {isOnline && <span title="Online" style={{ position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRadius: "50%", background: "#22c55e", border: "2px solid #0a0612", boxShadow: "0 0 6px rgba(34,197,94,0.7)" }} />}
                   </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{post.author}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{post.time}</div>
                  </div>
                   <div style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 8, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--gold)", fontSize: 13 }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setShowReport(true); setReportTarget({ id: post.id, type: "feed_post", name: post.author }); } }} onClick={(e) => { e.stopPropagation(); setShowReport(true); setReportTarget({ id: post.id, type: "feed_post", name: post.author }); }} aria-label="Report post"><FiFlag size={13} /></div>
                </div>
                <div style={{ padding: "10px 18px", fontSize: 14, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap", cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPostDetail(post.id); } }} onClick={() => openPostDetail(post.id)}>{post.text}</div>
                {post.img && (
                  <div className="feed-post-img-wrap" style={{ position: "relative" }}>
                    <img loading="lazy" src={post.img} alt="Photo" className="feed-post-img" style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block" }} onError={handleImgError} />
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
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text2)", display: "inline-flex", alignItems: "center", gap: 4 }} title="Views">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      {fmt(views)}
                    </span>
                    <span style={{ fontSize: 12, color: engagement > 0 ? "var(--gold)" : "var(--muted)", fontWeight: engagement > 0 ? 700 : 400 }} title={`Engagement: likes(${post.likes || 0}) · comments×2(${post.comments || 0}) · shares×3(${post.shares || 0})`}>
                      ✦ {fmt(engagement)}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {/* Equal flex:1 + minWidth:0 on all three (was 1.25/1.25/0.9 with
                      Report flexShrink:0) — uneven ratios could overflow the card's
                      rounded edge and clip Report. */}
                  <button className={"feed-action-btn" + (post.liked ? " liked-pop" : "")} style={{ flex: 1, minWidth: 0, height: 42, background: post.liked ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.04)", border: post.liked ? "1.5px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.08)", color: post.liked ? "#ff5c5c" : "#ff8a8a", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "0 4px", borderRadius: 14, transition: "all .2s ease", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} onClick={() => { const newLiked = !post.liked; const isStatic = feedPostsStatic.some(p => p.id === post.id); if (isStatic) { setFeedPostsStatic(prev => prev.map(p => p.id === post.id ? ({ ...p, liked: newLiked }) : p)); return; } updateFeedPostState(post.id, p => ({ ...p, liked: newLiked })); apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like-feed-post", postId: post.id, liked: newLiked }) }).then(r => { if (!r.ok) throw new Error("failed"); }).catch(() => { updateFeedPostState(post.id, p => ({ ...p, liked: !newLiked })); showToast("Failed to update like"); }); }}>♥ {post.likes + (post.liked ? 1 : 0)}</button>
                  <button className="feed-action-btn" style={{ flex: 1, minWidth: 0, height: 42, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#87CEEB", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "0 4px", borderRadius: 14, transition: "all .2s ease", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} onClick={() => {
                    if (replyingTo !== post.id && !postReplies[post.id]) {
                      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forum", type: "get-replies", postId: post.id }) })
                        .then((r: any) => r.json?.()).then((data: any) => {
                          if (data?.replies?.length) setPostReplies(prev => ({ ...prev, [post.id]: data.replies }));
                        }).catch(() => {});
                    }
                    setReplyingTo(replyingTo === post.id ? null : post.id);
                  }}>💬 {post.comments}</button>
                  <button className="feed-action-btn" style={{ flex: 1, minWidth: 0, height: 42, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text2)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "0 4px", borderRadius: 14, transition: "all .2s ease", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} onClick={() => { showToast("Link copied!"); }}>Share</button>
                </div>
                {replyingTo === post.id && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    {(postReplies[post.id] || []).map((reply: any, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <img loading="lazy" src={reply.avatar || currentUser.avatar} alt={`${reply.author || "User"}'s avatar`} className="feed-avatar" style={{ width: 28, height: 28, flexShrink: 0, cursor: "pointer" }} onError={handleImgError} onClick={(e) => openAuthorProfile({ id: reply.author, name: reply.author, avatar: reply.avatar }, e)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setViewProfile({ id: reply.author, name: reply.author, img: reply.avatar, type: "Creative" }); } }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{reply.author || "User"}</div>
                          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{reply.text}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{reply.time || "Just now"}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: "10px 16px 14px" }}>
                      <div style={{ position: "relative" }}>
                        <input
                            className="inp"
                            placeholder="Write a reply..."
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={async e => { if (e.key === "Enter" && commentText.trim()) { const txt = commentText.trim(); const isStatic = feedPostsStatic.some(p => p.id === post.id); if (isStatic) setFeedPostsStatic(prev => prev.map(p => p.id === post.id ? { ...p, comments: p.comments + 1 } : p)); else updateFeedPostState(post.id, p => ({ ...p, comments: p.comments + 1 })); setPostReplies(prev => ({ ...prev, [post.id]: [...(prev[post.id] || []), { author: currentUser.name, avatar: currentUser.avatar, text: txt, time: "Just now" }] })); setCommentText(""); if (isStatic) { showToast("Reply posted!"); return; } try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feed-comment", postId: post.id, text: txt }) }); if (!r.ok) throw new Error("failed"); showToast("Reply posted!"); } catch { updateFeedPostState(post.id, p => ({ ...p, comments: Math.max(0, p.comments - 1) })); setPostReplies(prev => ({ ...prev, [post.id]: (prev[post.id] || []).filter((r: any) => !(r.text === txt && r.author === currentUser.name)) })); showToast("Failed to post reply"); } } }}
                            style={{ width: "100%", margin: 0, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "10px 42px 10px 14px", fontSize: 13, color: "var(--text)" }}
                          />
                          <button
                            onClick={async () => { if (commentText.trim()) { const txt = commentText.trim(); const isStatic = feedPostsStatic.some(p => p.id === post.id); if (isStatic) setFeedPostsStatic(prev => prev.map(p => p.id === post.id ? { ...p, comments: p.comments + 1 } : p)); else updateFeedPostState(post.id, p => ({ ...p, comments: p.comments + 1 })); setPostReplies(prev => ({ ...prev, [post.id]: [...(prev[post.id] || []), { author: currentUser.name, avatar: currentUser.avatar, text: txt, time: "Just now" }] })); setCommentText(""); if (isStatic) { showToast("Reply posted!"); return; } try { const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feed-comment", postId: post.id, text: txt }) }); if (!r.ok) throw new Error("failed"); showToast("Reply posted!"); } catch { updateFeedPostState(post.id, p => ({ ...p, comments: Math.max(0, p.comments - 1) })); setPostReplies(prev => ({ ...prev, [post.id]: (prev[post.id] || []).filter((r: any) => !(r.text === txt && r.author === currentUser.name)) })); showToast("Failed to post reply"); } } }}
                            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", border: "none", background: commentText.trim() ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.06)", color: commentText.trim() ? "#fff" : "rgba(255,255,255,0.25)", cursor: commentText.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}
                          ><FiSend size={14} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {(() => {
        const dp = detailPostId != null ? allFeedPosts.find(p => p.id === detailPostId) : null;
        if (!dp) return null;
        const replies = postReplies[dp.id] || [];
        const sendDetailReply = async () => {
          const txt = commentText.trim();
          if (!txt) return;
          const optimistic = { author: currentUser.name, avatar: currentUser.avatar, text: txt, time: "Just now" };
          const isStatic = feedPostsStatic.some(p => p.id === dp.id);
          setPostReplies(prev => ({ ...prev, [dp.id]: [...(prev[dp.id] || []), optimistic] }));
          if (isStatic) setFeedPostsStatic(prev => prev.map(p => p.id === dp.id ? { ...p, comments: p.comments + 1 } : p));
          else updateFeedPostState(dp.id, p => ({ ...p, comments: p.comments + 1 }));
          setCommentText("");
          if (isStatic) { showToast("Reply posted!"); return; }
          try {
            const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feed-comment", postId: dp.id, text: txt }) });
            if (!r.ok) throw new Error("failed");
            showToast("Reply posted!");
          } catch {
            setPostReplies(prev => ({ ...prev, [dp.id]: (prev[dp.id] || []).filter(x => !(x.text === txt && x.author === currentUser.name)) }));
            updateFeedPostState(dp.id, p => ({ ...p, comments: Math.max(0, p.comments - 1) }));
            showToast("Failed to post reply");
          }
        };
        return createPortal(
          <div className="modal-overlay" style={{ position: "fixed", zIndex: 500 }}>
            <div className="modal-header">
              <button className="modal-back" onClick={() => setDetailPostId(null)}><FiArrowLeft size={20} /></button>
              <div className="modal-title">Post</div>
              <button className="modal-close" onClick={() => setDetailPostId(null)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <img loading="lazy" src={dp.avatar} alt="Avatar" className="feed-avatar" style={{ width: 46, height: 46, backgroundColor: "#1a0a2e" }} onError={handleImgError} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{dp.author}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{dp.time}</div>
                </div>
              </div>
              {dp.text && <div style={{ fontSize: 16, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: dp.img ? 14 : 18 }}>{dp.text}</div>}
              {dp.img && <img loading="lazy" src={dp.img} alt="Photo" style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 16, marginBottom: 14, display: "block" }} onError={handleImgError} />}
              {(() => {
                const dReactions = feedReactions[dp.id] || [];
                const dTotalReactions = ["❤️", "🔥", "😍", "😂", "😢", "😡"].reduce((s, r) => s + dReactions.filter(x => x === r).length, dp.liked ? 1 : 0);
                const dViews = typeof dp.views === "number" ? dp.views : 50 + (dp.likes || 0) * 8 + (dp.comments || 0) * 15 + (dp.shares || 0) * 25;
                const dEng = (dp.likes || 0) + (dp.comments || 0) * 2 + (dp.shares || 0) * 3 + dTotalReactions;
                const dFmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K" : String(n);
                return (
                  <div style={{ display: "flex", gap: 18, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 14, fontSize: 13, color: "var(--muted)", flexWrap: "wrap" }}>
                    <span title="Views" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>👁 {dFmt(dViews)} views</span>
                    <span>♥ {dp.likes + (dp.liked ? 1 : 0)} likes</span>
                    <span>💬 {dp.comments} replies</span>
                    <span style={{ color: dEng > 0 ? "var(--gold)" : "var(--muted)", fontWeight: dEng > 0 ? 700 : 400 }} title="Engagement: likes + comments×2 + shares×3 + reactions">✦ {dFmt(dEng)} engagement</span>
                  </div>
                );
              })()}
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Replies</div>
              {replies.length === 0 && (
                <div style={{ textAlign: "center", padding: "16px 0", color: "var(--muted)", fontSize: 12, fontStyle: "italic" }}>No replies yet — be the first.</div>
              )}
              {replies.map((reply: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                   <img loading="lazy" src={reply.avatar || currentUser.avatar} alt={`${reply.author || "User"}'s avatar`} className="feed-avatar" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }} onError={handleImgError} onClick={(e) => openAuthorProfile({ id: reply.author, name: reply.author, avatar: reply.avatar }, e)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setViewProfile({ id: reply.author, name: reply.author, img: reply.avatar, type: "Creative" }); } }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{reply.author || "User"} <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 11 }}>· {reply.time || "now"}</span></div>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{reply.text}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <div style={{ position: "relative" }}>
                  <input
                    className="inp"
                    placeholder="Post your reply…"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendDetailReply(); }}
                    style={{ width: "100%", margin: 0, borderRadius: 99, padding: "10px 42px 10px 14px" }}
                  />
                  <button
                    onClick={sendDetailReply}
                    style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", border: "none", background: commentText.trim() ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.06)", color: commentText.trim() ? "#fff" : "rgba(255,255,255,0.25)", cursor: commentText.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}
                  ><FiSend size={14} /></button>
                </div>
              </div>
            </div>
          </div>, document.body);
      })()}
      {cameraOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#000", display: "flex", flexDirection: "column" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ flex: 1, width: "100%", objectFit: "cover" }} />
          {camError && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 30, background: "#000" }}>
              <div style={{ fontSize: 40 }}>📷</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 1.6 }}>{camError}</div>
              <button className="btn btn-gold" style={{ padding: "10px 28px", borderRadius: 99 }} onClick={closeCamera}>Close</button>
            </div>
          )}
          {/* Top bar */}
          <div style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top,0px))", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px" }}>
            <button onClick={closeCamera} aria-label="Close camera" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <div style={{ display: "flex", background: "rgba(0,0,0,0.55)", borderRadius: 999, padding: 3, border: "1px solid rgba(255,255,255,0.15)" }}>
              {(["photo", "video"] as const).map(m => (
                <button key={m} disabled={recording} onClick={() => setCamMode(m)} style={{ padding: "7px 16px", borderRadius: 999, border: "none", background: camMode === m ? "var(--gold)" : "transparent", color: camMode === m ? "#0a0612" : "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 12, cursor: recording ? "default" : "pointer", textTransform: "capitalize" }}>{m}</button>
              ))}
            </div>
            <div style={{ width: 38 }} />
          </div>
          {/* Recording timer */}
          {recording && (
            <div style={{ position: "absolute", top: "calc(70px + env(safe-area-inset-top,0px))", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 7, background: "rgba(0,0,0,0.6)", borderRadius: 999, padding: "5px 14px" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff4444", animation: "pulse 1s infinite" }} />
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{String(Math.floor(recSecs / 60)).padStart(2, "0")}:{String(recSecs % 60).padStart(2, "0")} · max 30s</span>
            </div>
          )}
          {/* Shutter bar */}
          <div style={{ position: "absolute", bottom: "calc(26px + env(safe-area-inset-bottom,0px))", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 6 }}>
            {camMode === "photo" ? (
              <button
                onClick={capturePhoto}
                disabled={capturing || !!camError}
                aria-label="Take photo"
                style={{ width: 76, height: 76, borderRadius: "50%", background: capturing ? "rgba(255,215,0,0.4)" : "#fff", border: "5px solid rgba(255,215,0,0.9)", cursor: capturing ? "wait" : "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", transition: "transform .12s" }}
              />
            ) : (
              <button
                onClick={toggleRecord}
                disabled={!!camError}
                aria-label={recording ? "Stop recording" : "Start recording"}
                style={{ width: 76, height: 76, borderRadius: "50%", background: recording ? "#ff4444" : "rgba(255,68,68,0.25)", border: recording ? "5px solid rgba(255,255,255,0.95)" : "5px solid #ff4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", transition: "all .15s" }}
              >
                {recording ? <span style={{ width: 26, height: 26, borderRadius: 6, background: "#fff" }} /> : <span style={{ width: 54, height: 54, borderRadius: "50%", background: "#ff4444" }} />}
              </button>
            )}
          </div>
          {capturing && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
              <div style={{ color: "#FFD700", fontSize: 15, fontWeight: 700 }}>Uploading…</div>
            </div>
          )}
        </div>
      )}
      <Nav active="connections" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

export default FeedScreen;
