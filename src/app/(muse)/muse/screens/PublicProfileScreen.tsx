"use client";

import React, { memo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  FiChevronLeft, FiMoreVertical, FiMapPin, FiMessageCircle,
  FiExternalLink, FiInstagram, FiTwitter, FiYoutube, FiGlobe,
  FiHeart, FiStar, FiClock, FiShield, FiCheck, FiFlag, FiSlash, FiVolumeX,
} from "react-icons/fi";
import { ZODIAC_GLYPH, MbtiIcon, LifePathIcon, ChineseZodiacIcon } from "../components/traitIcons";
import { ZODIAC_FULL, MBTI_FULL, CHINESE_FULL, LIFE_PATH_FULL, STYLE_FULL, BadgeInfoModal, type BadgeInfo } from "../components/badgeInfo";
import Lightbox from "../components/Lightbox";

export interface PublicProfileUser {
  id: string;
  name?: string;
  age?: number;
  photo?: string;
  img?: string;
  photos?: string[];
  location?: string;
  distanceMi?: number;
  styles?: string[];
  bio?: string;
  zodiac?: string;
  mbti?: string;
  lifePath?: string;
  chineseZodiac?: string;
  chinese?: string;
  type?: string;
  lookingFor?: string[];
  collabs?: number;
  likes?: number;
  responseRate?: number;
  lastSeen?: string;
  isVerified?: boolean;
  verified?: boolean;
  isAgeVerified?: boolean;
  badges?: string[];
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
  };
  btsPhotos?: string[];
  videos?: string[];
  reviews?: { id: string; rating: number; body?: string; reviewer_id?: { name: string } }[];
  feedPosts?: { id: string; text?: string; image?: string; likes?: number; comments?: number }[];
  online?: boolean;
  nsfw?: boolean;
}

export interface PublicProfileScreenProps {
  user: PublicProfileUser;
  onBack: () => void;
  onMessage?: (user: PublicProfileUser) => void;
  onReport?: (user: PublicProfileUser) => void;
  onBlock?: (user: PublicProfileUser) => void;
  onMute?: (user: PublicProfileUser) => void;
  handleImgError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  currentUser?: any;
  apiFetch?: (url: string, opts?: any) => Promise<any>;
  showToast?: (msg: string) => void;
  lightboxPhotos?: string[];
  lightboxIdx?: number;
  setLightboxPhotos?: (p: string[]) => void;
  setLightboxIdx?: (i: number | ((p: number) => number)) => void;
}

export const PublicProfileScreen = memo(function PublicProfileScreen({
  user,
  onBack,
  onMessage,
  onReport,
  onBlock,
  onMute,
  handleImgError,
  currentUser,
  apiFetch,
  showToast,
  lightboxPhotos = [],
  lightboxIdx = 0,
  setLightboxPhotos = () => {},
  setLightboxIdx = () => {},
}: PublicProfileScreenProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
  const [reviews, setReviews] = useState<any[]>(user.reviews || []);
  const [feedPosts, setFeedPosts] = useState<any[]>(user.feedPosts || []);

  const photos: string[] = (user.photos?.length ? user.photos : [user.photo, user.img].filter(Boolean) as string[]);
  const displayName = user.name || "Unknown";
  const allPhotos: string[] = [
    ...photos,
    ...(user.btsPhotos || []),
  ].filter(Boolean);

  useEffect(() => {
    if (!user.id || !apiFetch) return;
    let cancelled = false;
    apiFetch(`/api/muse?type=reviews&profile_id=${encodeURIComponent(user.id)}`)
      .then((r: any) => r.json())
      .then((d: any) => { if (!cancelled) setReviews(d.reviews || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user.id, apiFetch]);

  useEffect(() => {
    if (!user.id || !apiFetch) return;
    let cancelled = false;
    apiFetch(`/api/muse?type=feed&profile_id=${encodeURIComponent(user.id)}`)
      .then((r: any) => r.json())
      .then((d: any) => { if (!cancelled) setFeedPosts(d.posts || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user.id, apiFetch]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const openLightbox = useCallback((idx: number) => {
    setLightboxPhotos(allPhotos);
    setLightboxIdx(idx);
  }, [allPhotos, setLightboxPhotos, setLightboxIdx]);

  const socialLinks = user.socialLinks || {};
  const hasSocialLinks = socialLinks.instagram || socialLinks.twitter || socialLinks.tiktok || socialLinks.youtube || socialLinks.website;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "linear-gradient(180deg,#0f081e 0%,#0a0612 100%)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "linear-gradient(180deg,rgba(15,8,30,0.98),rgba(15,8,30,0.85))", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,215,0,0.1)" }}>
        <button onClick={onBack} aria-label="Go back" style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}>
          <FiChevronLeft size={20} />
        </button>
        <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 20, fontWeight: 800, backgroundImage: "linear-gradient(135deg,var(--gold),var(--lavender),var(--pink),var(--gold))", backgroundSize: "400% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", animation: "gradientShift 6s ease-in-out infinite", lineHeight: "28px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>
          {displayName}
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowMenu(!showMenu)} aria-label="More options" style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}>
            <FiMoreVertical size={18} />
          </button>
          {showMenu && (
            <div style={{ position: "absolute", top: 48, right: 0, width: 200, background: "rgba(20,12,35,0.98)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 10 }}>
              {onReport && (
                <button onClick={() => { setShowMenu(false); onReport(user); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", background: "none", border: "none", color: "var(--text)", fontSize: 14, cursor: "pointer", borderRadius: 10, transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <FiFlag size={16} style={{ color: "#FF6B6B" }} /> Report
                </button>
              )}
              {onBlock && (
                <button onClick={() => { setShowMenu(false); onBlock(user); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", background: "none", border: "none", color: "var(--text)", fontSize: 14, cursor: "pointer", borderRadius: 10, transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <FiSlash size={16} style={{ color: "#FF6B6B" }} /> Block
                </button>
              )}
              {onMute && (
                <button onClick={() => { setShowMenu(false); onMute(user); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", background: "none", border: "none", color: "var(--text)", fontSize: 14, cursor: "pointer", borderRadius: 10, transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <FiVolumeX size={16} style={{ color: "var(--text2)" }} /> Mute
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile Hero */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", overflow: "hidden" }}>
        {(() => {
          const curPhoto = photos[photoIdx] || photos[0] || user.photo || user.img;
          return (
            <>
              <Image loading="lazy" src={curPhoto || ""} alt={displayName} fill sizes="(max-width: 600px) 100vw, 400px" style={{ objectFit: "cover" }} onError={handleImgError} />
              {/* Halo ring */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 156, height: 156, borderRadius: "50%", border: "2px solid rgba(255,215,0,0.25)", boxShadow: "0 0 30px rgba(255,215,0,0.15), inset 0 0 20px rgba(255,215,0,0.08)", animation: "spin 8s linear infinite", pointerEvents: "none" }} />
              {/* Gradient overlay */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "60px 20px 20px", background: "linear-gradient(to top,rgba(10,6,18,0.97) 0%,rgba(10,6,18,0.7) 50%,transparent 100%)", pointerEvents: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Playfair Display',serif", fontStyle: "italic", color: "#fff" }}>{displayName}</span>
                  {user.age && <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{user.age}</span>}
                  {(user.isVerified || user.verified) && <span role="button" tabIndex={0} title="Identity verified" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: "Identity Verified", desc: "Identity verified by Muse — we confirmed this member's government ID and professional credentials.", icon: "✓", color: "#22c55e" }); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "rgba(34,197,94,0.2)", border: "1.5px solid rgba(34,197,94,0.5)", fontSize: 12, fontWeight: 800, color: "#22c55e", pointerEvents: "auto", cursor: "pointer" }}>✓</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--gold)", fontWeight: 600, marginBottom: 6 }}>
                  {user.type && <span>{user.type}</span>}
                  {user.location && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, color: "rgba(255,255,255,0.5)", fontWeight: 400, fontSize: 13 }}>
                      <FiMapPin size={13} /> {user.location}
                      {typeof user.distanceMi === "number" && <span> · {user.distanceMi} mi</span>}
                    </span>
                  )}
                </div>
                {user.online && (
                  <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: "Online", desc: "This member is online right now — a good time to reach out.", icon: "🟢", color: "#4ade80" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 99, padding: "4px 10px", pointerEvents: "auto", cursor: "pointer" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.5)" }} />
                    Online
                  </div>
                )}
              </div>
              {/* Photo carousel dots */}
              {photos.length > 1 && (
                <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 4 }}>
                  {photos.map((_: string, i: number) => (
                    <div key={i} onClick={() => setPhotoIdx(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPhotoIdx(i); } }} style={{ width: 7, height: 7, borderRadius: "50%", background: i === photoIdx ? "#FFD700" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all .2s" }} />
                  ))}
                </div>
              )}
              {/* Left/right tap zones */}
              {photos.length > 1 && (
                <>
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPhotoIdx(p => p > 0 ? p - 1 : photos.length - 1); } }} onClick={() => setPhotoIdx(p => p > 0 ? p - 1 : photos.length - 1)} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "35%", zIndex: 3, cursor: "pointer" }} />
                  <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPhotoIdx(p => p < photos.length - 1 ? p + 1 : 0); } }} onClick={() => setPhotoIdx(p => p < photos.length - 1 ? p + 1 : 0)} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "35%", zIndex: 3, cursor: "pointer" }} />
                </>
              )}
            </>
          );
        })()}
      </div>

      <div style={{ padding: "0 16px 120px" }}>
        {/* Bio & Creative Identity */}
        {user.bio && (
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 10, fontFamily: "'Playfair Display',serif" }}>About</div>
            <p style={{ color: "var(--text2)", lineHeight: 1.7, fontSize: 14, margin: 0 }}>{user.bio}</p>
          </div>
        )}

        {/* Creative Types / Styles */}
        {user.styles && user.styles.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.05 }}>Aesthetic</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {user.styles.map((s: string) => (
                <button key={s} className="tag-pill" onClick={() => setBadgeInfo({ name: s, desc: STYLE_FULL[s] || "A creative style this member works in.", icon: "🎨", color: "#FFD700" })} style={{ cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Personality Badges */}
        {(user.zodiac || user.mbti || user.lifePath || user.chineseZodiac || user.chinese) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.05 }}>Personality</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {user.zodiac && (
                <button className="tag-pill" onClick={() => setBadgeInfo({ name: `${user.zodiac} — ${ZODIAC_FULL[user.zodiac!]?.tag || ""}`, desc: ZODIAC_FULL[user.zodiac!]?.desc || "", icon: ZODIAC_GLYPH[user.zodiac!] || "✦", color: "#FF69B4" })} style={{ cursor: "pointer" }}>
                  {ZODIAC_GLYPH[user.zodiac!] || "✦"} {user.zodiac}
                </button>
              )}
              {(user.chineseZodiac || user.chinese) && (
                <button className="tag-pill" onClick={() => setBadgeInfo({ name: user.chineseZodiac || user.chinese || "", desc: CHINESE_FULL[user.chineseZodiac || user.chinese || ""] || "", icon: <ChineseZodiacIcon animal={user.chineseZodiac || user.chinese || ""} size={20} />, color: "#FFA500" })} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <ChineseZodiacIcon animal={user.chineseZodiac || user.chinese || ""} size={12} /> {user.chineseZodiac || user.chinese}
                </button>
              )}
              {user.mbti && (
                <button className="tag-pill" onClick={() => setBadgeInfo({ name: `${user.mbti} — ${MBTI_FULL[user.mbti!]?.tag || ""}`, desc: MBTI_FULL[user.mbti!]?.desc || "", icon: <MbtiIcon code={user.mbti!} size={20} />, color: "#7B68EE" })} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <MbtiIcon code={user.mbti!} size={12} /> {user.mbti}
                </button>
              )}
              {user.lifePath && (
                <button className="tag-pill" onClick={() => setBadgeInfo({ name: `Life Path ${user.lifePath}`, desc: LIFE_PATH_FULL[String(user.lifePath)] || "", icon: <LifePathIcon n={Number(user.lifePath)} size={20} />, color: "#20B2AA" })} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <LifePathIcon n={Number(user.lifePath)} size={12} /> Path {user.lifePath}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {[
            { label: "Collabs", value: typeof user.collabs === "number" ? user.collabs : "—" },
            { label: "Likes", value: typeof user.likes === "number" ? user.likes : "—" },
            { label: "Response", value: typeof user.responseRate === "number" ? `${user.responseRate}%` : "—" },
            { label: "Last Seen", value: user.lastSeen || "—" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "14px 8px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)", fontFamily: "monospace" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Badges & Verification */}
        {(user.badges && user.badges.length > 0) || user.isVerified || user.isAgeVerified ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.05 }}>Badges</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {user.isVerified && (
                <span role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: "Identity Verified", desc: "Identity verified by Muse — we confirmed this member's government ID and professional credentials.", icon: "🛡", color: "#22c55e" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 99, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", cursor: "pointer" }}>
                  <FiShield size={12} /> Identity Verified
                </span>
              )}
              {user.isAgeVerified && (
                <span role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: "Age Verified", desc: "This member has verified they're a legal adult — required for 18+ work and age-gated content.", icon: "✅", color: "#3b82f6" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 99, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", cursor: "pointer" }}>
                  <FiCheck size={12} /> Age Verified
                </span>
              )}
              {(user.badges || []).map((b: string) => (
                <span key={b} role="button" tabIndex={0} onClick={() => setBadgeInfo({ name: b, desc: `A recognition badge earned by ${displayName} on Muse.`, icon: "🏅", color: "var(--gold)" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 99, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)", cursor: "pointer" }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Portfolio / Gallery */}
        {allPhotos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.05 }}>Gallery</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, borderRadius: 12, overflow: "hidden" }}>
              {allPhotos.map((p: string, i: number) => (
                <div key={i} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(i); } }} onClick={() => openLightbox(i)} style={{ position: "relative", aspectRatio: "1", cursor: "pointer", overflow: "hidden" }}>
                  <Image loading="lazy" src={p} alt={`${displayName}'s photo ${i + 1}`} fill sizes="(max-width: 600px) 33vw, 150px" style={{ objectFit: "cover" }} onError={handleImgError} />
                  {i === photos.length && user.btsPhotos && user.btsPhotos.length > 0 && i === photos.length && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--gold)" }}>BTS</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {user.videos && user.videos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.05 }}>Videos</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {user.videos.map((v: string, i: number) => (
                <div key={i} style={{ position: "relative", aspectRatio: "9/16", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                  <video src={v} style={{ width: "100%", height: "100%", objectFit: "cover" }} preload="metadata" />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.3)" }}>
                      <FiHeart size={18} style={{ color: "#fff", marginLeft: 2 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed Posts */}
        {feedPosts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.05 }}>Recent Posts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {feedPosts.slice(0, 3).map((post: any) => (
                <div key={post.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
                  {post.image && (
                    <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden" }}>
                      <Image loading="lazy" src={post.image} alt="Post" fill sizes="(max-width: 600px) 100vw, 500px" style={{ objectFit: "cover" }} onError={handleImgError} />
                    </div>
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    {post.text && <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, margin: "0 0 8px" }}>{post.text}</p>}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--muted)" }}>
                      {typeof post.likes === "number" && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FiHeart size={12} /> {post.likes}</span>}
                      {typeof post.comments === "number" && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FiMessageCircle size={12} /> {post.comments}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.05 }}>Reviews</div>
              {avgRating && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>
                  <FiStar size={14} style={{ fill: "var(--gold)" }} /> {avgRating}
                  <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>({reviews.length})</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reviews.slice(0, 5).map((rv: any) => (
                <div key={rv.id} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{rv.reviewer_id?.name || "Anonymous"}</span>
                    <span style={{ fontSize: 13, color: "var(--gold)" }}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span>
                  </div>
                  {rv.body && <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>{rv.body}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.05 }}>Connect</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {socialLinks.instagram && (
                <a href={`https://instagram.com/${socialLinks.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "var(--text)", transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                  <FiInstagram size={18} style={{ color: "#E4405F" }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>@{socialLinks.instagram.replace(/^@/, "")}</span>
                  <FiExternalLink size={14} style={{ color: "var(--muted)" }} />
                </a>
              )}
              {socialLinks.twitter && (
                <a href={`https://x.com/${socialLinks.twitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "var(--text)", transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                  <FiTwitter size={18} style={{ color: "#1DA1F2" }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>@{socialLinks.twitter.replace(/^@/, "")}</span>
                  <FiExternalLink size={14} style={{ color: "var(--muted)" }} />
                </a>
              )}
              {socialLinks.tiktok && (
                <a href={`https://tiktok.com/@${socialLinks.tiktok.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "var(--text)", transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#00f2ea" }}>♪</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>@{socialLinks.tiktok.replace(/^@/, "")}</span>
                  <FiExternalLink size={14} style={{ color: "var(--muted)" }} />
                </a>
              )}
              {socialLinks.youtube && (
                <a href={`https://youtube.com/@${socialLinks.youtube.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "var(--text)", transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                  <FiYoutube size={18} style={{ color: "#FF0000" }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>@{socialLinks.youtube.replace(/^@/, "")}</span>
                  <FiExternalLink size={14} style={{ color: "var(--muted)" }} />
                </a>
              )}
              {socialLinks.website && (
                <a href={socialLinks.website.startsWith("http") ? socialLinks.website : `https://${socialLinks.website}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "var(--text)", transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                  <FiGlobe size={18} style={{ color: "var(--gold)" }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{socialLinks.website}</span>
                  <FiExternalLink size={14} style={{ color: "var(--muted)" }} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Looking For */}
        {user.lookingFor && user.lookingFor.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.05 }}>Looking For</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {user.lookingFor.map((l: string) => (
                <button key={l} className="tag-pill" onClick={() => setBadgeInfo({ name: l, desc: `This member is looking for ${l.toLowerCase()}s to collaborate with.`, icon: "🤝", color: "#FF69B4" })} style={{ background: "rgba(255,105,180,0.08)", borderColor: "rgba(255,105,180,0.25)", color: "#FF69B4", cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {/* Last Seen */}
        {user.lastSeen && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "var(--muted)" }}>
            <FiClock size={13} /> Last active {user.lastSeen}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(to top,rgba(10,6,18,0.98) 60%,rgba(10,6,18,0.85) 80%,transparent 100%)", display: "flex", gap: 10, zIndex: 100 }}>
        {onMessage && (
          <button onClick={() => onMessage(user)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0", borderRadius: 14, background: "linear-gradient(135deg,var(--gold),#FFA07A)", border: "none", color: "#0a0612", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "opacity .15s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          <FiMessageCircle size={18} /> Message
        </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhotos.length > 0 && (
        <Lightbox photos={lightboxPhotos} idx={lightboxIdx} onClose={() => setLightboxPhotos([])} onNavigate={setLightboxIdx} onError={handleImgError} />
      )}

      <BadgeInfoModal info={badgeInfo} onClose={() => setBadgeInfo(null)} />

      <style>{`
        @keyframes spin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
});

export default PublicProfileScreen;
