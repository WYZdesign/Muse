"use client";

import React, { memo, useState, useEffect } from "react";
import Image from "next/image";
import { FiSearch, FiSettings, FiCompass, FiZap, FiCamera, FiX, FiChevronRight, FiFilter, FiInfo } from "react-icons/fi";
import Nav from "../components/Nav";
import MuseMap from "../components/MuseMap";
import { EmptyState } from "../components/EmptyState";
import type { Screen, Profile, LikeAnchor } from "../components/types";
import { CITY_GEO } from "../components/types";
import { distanceMiles } from "@/app/muse-realtime";
import { PORTRAIT_IMG } from "../components/photoOrientation";
import { ensureDeviceTiltActive, getDeviceTilt, createSpatialScene } from "../hooks/useDeviceTilt";
import { attachSpatialDepth } from "../hooks/useSpatialDepth";
import { ZODIAC_GLYPH, MbtiIcon, LifePathIcon, ChineseZodiacIcon } from "../components/traitIcons";
import { ZODIAC_FULL, MBTI_FULL, CHINESE_FULL, LIFE_PATH_FULL, STYLE_FULL, CONN_FULL } from "../components/badgeInfo";
import Lightbox from "../components/Lightbox";
import MuseSpark from "../components/MuseSpark";

export interface DiscoverScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  showNsfw: boolean;
  openHamburger: () => void;
  unreadNotificationCount: number;
  discoveryPrefs: any;
  setDiscoveryPrefs: React.Dispatch<React.SetStateAction<any>>;
  showDiscoveryPrefs: boolean;
  setShowDiscoveryPrefs: (v: boolean) => void;
  showFilterModal: boolean;
  setShowFilterModal: (v: boolean) => void;
  mapView: boolean;
  setMapView: (v: boolean | ((p: boolean) => boolean)) => void;
  filteredProfiles: Profile[];
  isLoading?: boolean;
  currentIdx: number;
  setCurrentIdx: (v: number | ((p: number) => number)) => void;
  boostActive: boolean;
  setBoostActive: (v: boolean) => void;
  setBoostEnd: (v: number) => void;
  discoverSearchOpen: boolean;
  setDiscoverSearchOpen: (v: boolean) => void;
  discoverSearch: string;
  setDiscoverSearch: (v: string) => void;
  myGeo: any;
  myStyles?: string[];
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  doSwipe: (dir: "left" | "right" | "super") => void;
  setViewProfile: (p: any) => void;
  viewProfile: any;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  matches: any[];
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  openChat: (m: any) => void;
  setChatTarget: (m: any) => void;
  stories: any[];
  currentUser: any;
  uid: () => any;
  safeSetItem?: (k: string, v: string) => void;
  safeRemoveItem?: (k: string) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  currentPhotoIdx?: number;
  setCurrentPhotoIdx?: (v: number | ((p: number) => number)) => void;
  cardScrolled?: boolean;
  setCardScrolled?: (v: boolean) => void;
  showNoteTooltip?: boolean;
  setShowNoteTooltip?: (v: boolean) => void;
  promptIdx?: number;
  setPromptIdx?: (v: number | ((p: number) => number)) => void;
  cardAlbumIdx?: number;
  setCardAlbumIdx?: (v: number) => void;
  cardAlbumPhotos?: string[];
  cardAlbums?: any[];
  portfolioPhotoIdx?: number;
  setPortfolioPhotoIdx?: (v: number | ((p: number) => number)) => void;
  setLightboxPhotos?: (p: string[]) => void;
  setLightboxIdx?: (i: number | ((p: number) => number)) => void;
  showMatchMenu?: boolean;
  setShowMatchMenu?: (v: boolean | ((p: boolean) => boolean)) => void;
  doRewind?: () => void;
  doLikeWithNote?: (anchor?: LikeAnchor) => void;
  onAnchorLike?: (anchor: LikeAnchor) => void;
  setDailyLikes?: (v: number) => void;
  setSuperLikes?: (v: number) => void;
  isUnlimited?: boolean;
  dailyLikes?: number;
  superLikes?: number;
  galleryView?: any;
  setGalleryView?: (v: any) => void;
  lightboxPhotos?: string[];
  lightboxIdx?: number;
  heroRef?: React.RefObject<HTMLDivElement | null>;
  likeLabelRef?: React.RefObject<HTMLDivElement | null>;
  nopeLabelRef?: React.RefObject<HTMLDivElement | null>;
  superLabelRef?: React.RefObject<HTMLDivElement | null>;
  cardScrollRef?: React.RefObject<HTMLDivElement | null>;
}

export const DiscoverScreen = memo(function DiscoverScreen({
  screen,
  discoverSearchOpen,
  setDiscoverSearchOpen,
  discoverSearch,
  setDiscoverSearch,
  setShowDiscoveryPrefs,
  discoveryPrefs,
  setShowFilterModal,
  mapView,
  setMapView,
  boostActive,
  setBoostActive,
  setBoostEnd,
  apiFetch,
  showToast,
  safeSetItem = () => {},
  safeRemoveItem = () => {},
  filteredProfiles,
  isLoading = false,
  myGeo,
  myStyles = [],
  currentIdx,
  setCurrentIdx,
  onPointerDown = () => {},
  onPointerMove = () => {},
  onPointerUp = () => {},
  onPointerCancel = () => {},
  currentPhotoIdx = 0,
  setCurrentPhotoIdx = () => {},
  cardScrolled = false,
  setCardScrolled = () => {},
  showNoteTooltip = false,
  setShowNoteTooltip = () => {},
  promptIdx = 0,
  setPromptIdx = () => {},
  cardAlbumIdx = 0,
  setCardAlbumIdx = () => {},
  cardAlbumPhotos = [],
  cardAlbums = [],
  portfolioPhotoIdx = 0,
  setPortfolioPhotoIdx = () => {},
  setLightboxPhotos = () => {},
  setLightboxIdx = () => {},
  showMatchMenu = false,
  setShowMatchMenu = () => {},
  doRewind = () => {},
  doSwipe,
  doLikeWithNote = () => {},
  onAnchorLike,
  setDailyLikes = () => {},
  setSuperLikes = () => {},
  isUnlimited = false,
  dailyLikes = 0,
  superLikes = 0,
  galleryView = null,
  setGalleryView = () => {},
  lightboxPhotos = [],
  lightboxIdx = 0,
  showScreen,
  openHamburger,
  unreadNotificationCount,
  handleImgError,
  heroRef,
  likeLabelRef,
  nopeLabelRef,
  superLabelRef,
  cardScrollRef,
}: DiscoverScreenProps) {
  const [badgeInfo, setBadgeInfo] = useState<{ name: string; desc: string; icon: React.ReactNode; color: string } | null>(null);
  const [whyInfo, setWhyInfo] = useState<{ score: number; reasons: string[] } | null>(null);
  const [revealedNsfw, setRevealedNsfw] = useState<Set<string>>(new Set());
  // Tapping a specific prompt or photo opens the like-with-note composer
  // already anchored to that content (Hinge-style). Falls back to
  // doLikeWithNote directly if the caller doesn't wire a dedicated handler.
  const handleAnchorLike = onAnchorLike ?? ((anchor: LikeAnchor) => doLikeWithNote(anchor));

  // ═══ PHOTO LIKES (like the image, not the match) ═══
  const [photoLike, setPhotoLike] = useState<{ [url: string]: { liked: boolean; count: number } }>({});
  // Current hero photo URL for the top card (kept in sync so the spark counter
  // reflects exactly the photo being viewed).
  const topCard = filteredProfiles[currentIdx];
  const topHeroSrc = (() => {
    const base: string[] = (topCard as any)?.photos?.length ? (topCard as any).photos : [topCard?.img];
    return (base[currentPhotoIdx ?? 0]) || topCard?.img || "";
  })();

  useEffect(() => {
    if (!topHeroSrc || screen !== "discover") return;
    let cancelled = false;
    apiFetch(`/api/muse?type=photo-likes&urls=${encodeURIComponent(topHeroSrc)}`).then(r => r.json()).then(d => {
      if (!cancelled && d) setPhotoLike(prev => ({ ...prev, [topHeroSrc]: { liked: !!d.likedByMe?.[topHeroSrc], count: d.counts?.[topHeroSrc] || 0 } }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [topHeroSrc, screen, currentPhotoIdx]);

  const togglePhotoLike = async (url: string) => {
    if (!url) return;
    setPhotoLike(prev => ({ ...prev, [url]: { liked: !prev[url]?.liked, count: (prev[url]?.count || 0) + (prev[url]?.liked ? -1 : 1) } }));
    try {
      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle-photo-like", photoUrl: url }) });
      const d = await r.json();
      if (d.success) setPhotoLike(prev => ({ ...prev, [url]: { liked: d.liked, count: d.count } }));
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    if (screen !== "discover") return;
    return createSpatialScene(
      ".swipe-card.top-card",
      ".card-hero img",
      ".card-hero-info",
      { imgShift: 15, imgRotate: 18, infoShift: 15, containerShift: 8, scale: 1.12 }
    );
  }, [screen]);

  // True depth-aware upgrade (real depth map, or in-browser segmentation
  // fallback) layered on top of the flat tilt above — see useSpatialDepth.ts.
  // Re-attaches per top-card change since (unlike createSpatialScene, which
  // re-polls the DOM every frame) this builds its layers once per photo.
  useEffect(() => {
    if (screen !== "discover") return;
    let detach: (() => void) | null = null;
    const t = setTimeout(() => {
      detach = attachSpatialDepth(".swipe-card.top-card", ".card-hero img");
    }, 50);
    return () => {
      clearTimeout(t);
      detach?.();
    };
  }, [screen, currentIdx]);

  return (
    <div className={"screen-el" + (screen === "discover" ? " active" : "")} data-screen="discover">
      <div className="discover-wrap">
        <div className="hdr">
          <div className="logo-link" style={{ fontSize: 37.5, backgroundImage: "linear-gradient(90deg,#FFD700,#FF8C69,#FFB6C1,#FFD700,#FFA07A,#FFD700)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", position: "static", left: "auto", top: "auto", transform: "none", animation: "lavaFlow 7s ease-in-out infinite,logoShimmer 4s ease-in-out infinite" }}>Discover</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className="hdr-btn"
              style={{ width: 34, height: 34 }}
              onClick={() => { if (discoverSearchOpen) { setDiscoverSearchOpen(false); setDiscoverSearch(""); } else { setDiscoverSearchOpen(true); } }}
              aria-label="Search"
            ><FiSearch size={16} /></button>
            {discoverSearchOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, animation: "fadeIn .2s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "3px 5px 3px 14px", flex: 1, minWidth: 0 }}>
                  <input className="inp" placeholder="Name, style, type, or city..." value={discoverSearch} onChange={e => setDiscoverSearch(e.target.value)} autoFocus style={{ margin: 0, padding: "8px 0", fontSize: 14, flex: 1, minWidth: 0, border: "none", background: "transparent", boxShadow: "none" }} />
                  <button className="hdr-btn" aria-label="Search" title="Search" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0 }} onClick={() => { (document.activeElement as HTMLElement)?.blur?.(); }}>
                    <FiSearch size={15} />
                  </button>
                  {discoverSearch.trim() && (
                    <button className="hdr-btn" aria-label="Clear search" title="Clear" style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, fontSize: 10 }} onClick={() => setDiscoverSearch("")}>
                      <FiX size={13} />
                    </button>
                  )}
                </div>
                {discoverSearch.trim() && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: filteredProfiles.length ? "var(--gold)" : "#ff8a80", padding: "3px 9px", borderRadius: 99, background: "rgba(255,255,255,0.06)", whiteSpace: "nowrap", flexShrink: 0 }}>{filteredProfiles.length} {filteredProfiles.length === 1 ? "match" : "matches"}</span>
                )}
              </div>
            )}
            {!discoverSearchOpen && (
              <>
                <button className="hdr-btn" onClick={() => setShowDiscoveryPrefs(true)} style={{ width: 34, height: 34 }} aria-label="Discovery Preferences"><FiSettings size={16} /></button>
                <button className={"hdr-btn" + (mapView ? " hdr-btn-glow" : "")} onClick={() => setMapView(v => !v)} title="Map View" style={{ width: 34, height: 34 }} aria-label="Map View"><FiCompass size={16} /></button>
                <button className={"hdr-btn" + (boostActive ? " hdr-btn-glow" : "")} onClick={() => { if (boostActive) { setBoostActive(false); setBoostEnd(0); try { safeRemoveItem?.("muse_boost"); } catch {} showToast("Boost off"); return; } apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "boost" }) }).then((r: any) => { if (r.ok) { const end = Date.now() + 1800000; setBoostActive(true); setBoostEnd(end); try { safeSetItem?.("muse_boost", "" + end); } catch {} showToast("Boost on for 30 min!"); } else { r.json?.().then((d: any) => showToast((d && (d.error || "Boost unavailable")) || "Boost unavailable")).catch(() => showToast("Boost unavailable")); } }).catch(() => showToast("Boost unavailable")); }} style={{ width: 34, height: 34 }} aria-label="Boost"><FiZap size={16} /></button>
              </>
            )}
          </div>
        </div>
        {mapView && <MuseMap filteredProfiles={filteredProfiles as any} myGeo={myGeo ? { lat: myGeo.lat, lng: myGeo.long } : undefined} onClose={() => setMapView(false)} />}
        {!mapView && (
          <>
            <div className="card-stack" role="application" aria-label="Swipe cards to discover creatives" aria-roledescription="card carousel">
              {isLoading && filteredProfiles.length === 0 && (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={"skel-" + idx} className="swipe-card" style={{ position: idx === 0 ? "relative" : "absolute", top: idx === 0 ? 0 : idx * 10, left: 0, right: 0, opacity: idx === 0 ? 1 : 0.6, zIndex: 3 - idx, height: "100%", borderRadius: 24, overflow: "hidden", background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}>
                    <div style={{ height: "76%", background: "linear-gradient(110deg, rgba(255,255,255,0.08) 8%, rgba(255,255,255,0.03) 18%, rgba(255,255,255,0.08) 33%)", backgroundSize: "200% 100%", animation: "skeletonPulse 1.6s ease-in-out infinite" }} />
                    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ width: "55%", height: 22, borderRadius: 8, background: "linear-gradient(110deg, rgba(255,255,255,0.1) 8%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0.1) 33%)", backgroundSize: "200% 100%", animation: "skeletonPulse 1.6s ease-in-out infinite" }} />
                      <div style={{ width: "35%", height: 14, borderRadius: 6, background: "linear-gradient(110deg, rgba(255,215,0,0.14) 8%, rgba(255,215,0,0.05) 18%, rgba(255,215,0,0.14) 33%)", backgroundSize: "200% 100%", animation: "skeletonPulse 1.8s ease-in-out infinite" }} />
                      <div style={{ width: "28%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.07)" }} />
                    </div>
                  </div>
                ))
              )}
              {!isLoading && filteredProfiles.slice(currentIdx, currentIdx + 3).map((profile, idx) => {
                const isTop = idx === 0;
                return (
                  <div
                    key={profile.id}
                    className={"swipe-card" + (isTop ? " top-card" : "")}
                    style={{ zIndex: 3 - idx, transform: "scale(" + (Math.max(0.92, 1 - idx * 0.04)) + ")" }}
                    onPointerDown={isTop ? onPointerDown : undefined}
                    onPointerMove={isTop ? onPointerMove : undefined}
                    onPointerUp={isTop ? onPointerUp : undefined}
                    onPointerCancel={isTop ? onPointerCancel : undefined}
                  >
                    {(() => {
                      const allPhotosBase: string[] = (profile as any).photos?.length ? (profile as any).photos : [profile.img];
                      // Dedupe so no image repeats on a card; each slot is a distinct photo.
                      const allPhotos: string[] = allPhotosBase.filter((p: string, i: number, a: string[]) => p && a.indexOf(p) === i);
                      const portraitPics = allPhotos.filter((p: string) => !!PORTRAIT_IMG[p]);
                      const landscapePics = allPhotos.filter((p: string) => !PORTRAIT_IMG[p]);
                      const photos: string[] = [...portraitPics, ...landscapePics].slice(0, 6);
                      if (photos.length < 4) {
                        const used = new Set(photos);
                        const extra = allPhotos.filter((p: string) => !used.has(p));
                        photos.push(...extra.slice(0, Math.max(0, 4 - photos.length)));
                      }
                      const heroSrc = photos[currentPhotoIdx ?? 0] || profile.img;
                      const heroPortrait = !!PORTRAIT_IMG[heroSrc];
                      return (
                        <>
                          <div
                            className="card-hero"
                            ref={heroRef as any}
                          >
                            <Image
                              src={heroSrc}
                              alt={profile.name}
                              fill
                              sizes="(max-width: 600px) 100vw, 400px"
                              draggable={false}
                              onError={handleImgError}
                              unoptimized
                              style={{ objectFit: "cover", objectPosition: heroPortrait ? "center top" : "center", background: "linear-gradient(160deg,#1a0a2e,#0a0612)", transition: "transform 0.15s ease-out, filter 0.3s ease", transformStyle: "preserve-3d", filter: (profile as any).nsfw && !revealedNsfw.has(String(profile.id)) ? "blur(26px) brightness(0.7)" : "none" }}
                            />
                                        {(profile as any).nsfw && !revealedNsfw.has(String(profile.id)) && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setRevealedNsfw(prev => { const n = new Set(prev); n.add(String(profile.id)); return n; }); }}
                                            style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(10,6,18,0.45)", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer" }}
                              >
                                <div style={{ fontSize: 30, fontWeight: 800, color: "#ff8a80" }}>18+</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: 0.03 }}>NSFW content</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Tap to reveal</div>
                              </button>
                            )}
                            <div className="card-shine" />
                            <div className="card-gradient" />
                            <div className="card-border" />
                          </div>
                          <div className={"card-hero-info" + (cardScrolled ? " hidden" : "")}>
                            <div className="card-hero-name">
                              {profile.name}
                              {profile.verified && <span className="card-verified-mark">✓</span>}
                              {profile.online && <span className="card-online-dot" />}
                            </div>
                            {(() => {
                              const ms = Number((profile as any).matchScore || 0);
                              return ms >= 15 ? (
                                <div className="card-hero-badge" style={{ background: "rgba(255,215,0,0.16)", border: "1px solid rgba(255,215,0,0.4)", color: "var(--gold)", fontWeight: 800 }}>✦ {ms}% match</div>
                              ) : null;
                            })()}
                            {!!(profile as any).boosted && (
                              <div className="card-hero-badge" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.28), rgba(233,30,99,0.28))", border: "1px solid rgba(255,215,0,0.55)", color: "#fff", fontWeight: 800, letterSpacing: 0.04 }}>⚡ BOOSTED</div>
                            )}
                            <div className="card-hero-type">{profile.type}</div>
                            <div className="card-hero-loc">
                              {profile.loc && <span>{profile.loc}</span>}
                              {(() => {
                                const pLat = (profile as any).lat ?? CITY_GEO[profile.loc]?.lat;
                                const pLong = (profile as any).long ?? CITY_GEO[profile.loc]?.long;
                                if (myGeo && typeof pLat === "number" && typeof pLong === "number") {
                                  const d = distanceMiles({ lat: myGeo.lat, long: myGeo.long }, { lat: pLat, long: pLong });
                                  if (Number.isFinite(d)) return <span>{d < 1 ? "<1 mi" : `${Math.round(d)} mi`}</span>;
                                }
                                return null;
                              })()}
                            </div>
                            <div className="card-hero-badges">
                              {(profile as any).zodiac && <span className="card-hero-badge">{ZODIAC_GLYPH[(profile as any).zodiac] || "✦"} {(profile as any).zodiac}</span>}
                              {(profile as any).mbti && <span className="card-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MbtiIcon code={(profile as any).mbti} size={11} /> {(profile as any).mbti}</span>}
                              {(profile as any).lifePath && <span className="card-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><LifePathIcon n={Number((profile as any).lifePath)} size={11} /> LP {(profile as any).lifePath}</span>}
                              {(profile as any).chinese && <span className="card-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ChineseZodiacIcon animal={(profile as any).chinese} size={11} /> {(profile as any).chinese}</span>}
                              {(profile as any).skills?.slice(0, 2).map((s: string) => <span key={s} className="card-hero-badge">{s}</span>)}
                            </div>
                          </div>
                          {isTop && (
                            <>
                              <div className={"card-photo-zone card-photo-zone-left" + (cardScrolled ? " hidden" : "")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setCurrentPhotoIdx?.(prev => Math.max(0, prev - 1)); } }} style={{ pointerEvents: cardScrolled ? "none" : "auto" }} onClick={(e) => { e.stopPropagation(); setCurrentPhotoIdx?.(prev => Math.max(0, prev - 1)); }}><span className="card-photo-nav" style={{ left: 6 }}>‹</span></div>
                              <div className={"card-photo-zone card-photo-zone-right" + (cardScrolled ? " hidden" : "")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setCurrentPhotoIdx?.(prev => Math.min(photos.length - 1, prev + 1)); } }} style={{ pointerEvents: cardScrolled ? "none" : "auto" }} onClick={(e) => { e.stopPropagation(); setCurrentPhotoIdx?.(prev => Math.min(photos.length - 1, prev + 1)); }}><span className="card-photo-nav" style={{ right: 6 }}>›</span></div>
                            </>
                          )}
                          <div className={"card-photo-dots" + (cardScrolled ? " hidden" : "")}>
                            {photos.map((_: string, i: number) => <div key={i} className={"card-photo-dot" + (i === currentPhotoIdx ? " active" : "")} />)}
                          </div>
                          {isTop && (!(profile as any).nsfw || revealedNsfw.has(String(profile.id))) && (
                            <button
                              className={"card-anchor-like-btn" + (cardScrolled ? " hidden" : "")}
                              style={{ top: 12, right: 12, display: "flex", alignItems: "center", gap: 5 }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); togglePhotoLike(heroSrc); }}
                              aria-label={`Like photo ${(currentPhotoIdx ?? 0) + 1}`}
                            ><MuseSpark size={16} /><span style={{ fontSize: 11, fontWeight: 700 }}>{photoLike[heroSrc]?.count || 0}</span></button>
                          )}
                          {showNoteTooltip && (
                            <div style={{ textAlign: "center", padding: "4px 16px 0", animation: "tooltipIn .4s ease" }}>
                              <div style={{ display: "inline-block", background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "var(--text2)", maxWidth: 280 }}>
                                💬 <b>Send a note</b> with your like to stand out. Introduce yourself or mention why you want to connect.
                                <button onClick={() => { setShowNoteTooltip?.(false); safeSetItem?.("muse_note_seen", "1"); }} style={{ display: "block", width: "100%", marginTop: 6, background: "none", border: "none", color: "var(--gold)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Got it</button>
                              </div>
                            </div>
                          )}
                          {isTop && (
                            <>
                              <div ref={likeLabelRef as any} className="label label-like">LIKE</div>
                              <div ref={nopeLabelRef as any} className="label label-nope">NOPE</div>
                              <div ref={superLabelRef as any} className="label label-super">SUPER</div>
                            </>
                          )}
                          <div className="card-info-scroll" ref={cardScrollRef as any} onScroll={(e) => { if (isTop) { const scrollY = (e.target as HTMLElement)?.scrollTop || 0; setCardScrolled?.(scrollY > 10); } }}>
                            <div className="card-details">
                              {(profile as any).prompts?.length > 0 && (
                                <div className="card-section">
                                  <div className="card-section-title">Prompts</div>
                                  <div className="card-prompts" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                    <button className="card-prompt-arrow" onClick={(e) => { e.stopPropagation(); setPromptIdx?.(prev => Math.max(0, (prev ?? 0) - 1)); }} style={{ opacity: (promptIdx ?? 0) > 0 ? 1 : 0.3 }}>‹</button>
                                    <div className="card-prompt-text">
                                      <div className="card-prompt-q">{(profile as any).prompts[promptIdx ?? 0]?.q || ""}</div>
                                      <div className="card-prompt-a">{(profile as any).prompts[promptIdx ?? 0]?.a || ""}</div>
                                    </div>
                                    <button className="card-prompt-arrow" onClick={(e) => { e.stopPropagation(); setPromptIdx?.(prev => Math.min(((profile as any).prompts.length - 1), (prev ?? 0) + 1)); }} style={{ opacity: (promptIdx ?? 0) < ((profile as any).prompts.length - 1) ? 1 : 0.3 }}>›</button>
                                    <button
                                      className="card-prompt-like-btn"
                                      onClick={(e) => { e.stopPropagation(); const p = (profile as any).prompts[promptIdx ?? 0]; if (p) handleAnchorLike({ type: "prompt", value: p.a || p.q || "" }); }}
                                      aria-label="Like this prompt"
                                      title="Like this prompt"
                                    >✦</button>
                                  </div>
                                </div>
                              )}
                              {profile.bio && <div className="card-section"><div className="card-section-title">About</div><div className="card-section-text">{profile.bio}</div></div>}
                              {(profile as any).side === "industry" && <div className="card-section"><div className="card-section-title">Hiring</div><div className="card-section-tags"><span className="tag" style={{ borderColor: "rgba(100,181,246,0.4)", color: "#90caf9" }}>Industry — can book &amp; pay you</span></div></div>}
                              {profile.looking.length > 0 && <div className="card-section"><div className="card-section-title">Looking for</div><div className="card-section-text">{profile.looking.join(", ")}</div></div>}
                              <div className="card-section"><div className="card-section-title">Creative Style</div>
                                <div className="card-section-tags">{profile.styles.map(s => <button key={s} className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: s, desc: STYLE_FULL[s] || "A creative style this member works in.", icon: "🎨", color: "#FFD700" }); }} style={{ cursor: "pointer" }}>{s}</button>)}</div>
                              </div>
                              <div className="card-section">
                                <div className="card-section-title">Personality</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {(profile as any).zodiac && <button className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: ((profile as any).zodiac), desc: `${ZODIAC_FULL[(profile as any).zodiac]?.tag}. ${ZODIAC_FULL[(profile as any).zodiac]?.desc}`, icon: ZODIAC_FULL[(profile as any).zodiac]?.icon || "♈", color: "#D4A5FF" }); }} style={{ background: "rgba(212,165,255,0.12)", border: "1px solid rgba(212,165,255,0.25)", color: "var(--lavender)", cursor: "pointer" }}>{({ Aries: "♈ Aries", Taurus: "♉ Taurus", Gemini: "♊ Gemini", Cancer: "♋ Cancer", Leo: "♌ Leo", Virgo: "♍ Virgo", Libra: "♎ Libra", Scorpio: "♏ Scorpio", Sagittarius: "♐ Sagittarius", Capricorn: "♑ Capricorn", Aquarius: "♒ Aquarius", Pisces: "♓ Pisces" } as any)[(profile as any).zodiac] || (profile as any).zodiac}</button>}
                                  {(profile as any).mbti && <button className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: (profile as any).mbti, desc: `${MBTI_FULL[(profile as any).mbti]?.tag}. ${MBTI_FULL[(profile as any).mbti]?.desc}`, icon: <MbtiIcon code={(profile as any).mbti} size={26} />, color: "#FFD700" }); }} style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><MbtiIcon code={(profile as any).mbti} size={12} />{({ INTJ: "Architect", INTP: "Logician", ENTJ: "Commander", ENTP: "Debater", INFJ: "Advocate", INFP: "Mediator", ENFJ: "Protagonist", ENFP: "Campaigner", ISTJ: "Logistician", ISFJ: "Defender", ESTJ: "Executive", ESFJ: "Consul", ISTP: "Virtuoso", ISFP: "Adventurer", ESTP: "Entrepreneur", ESFP: "Entertainer" } as any)[(profile as any).mbti] || (profile as any).mbti} · {(profile as any).mbti}</button>}
                                  {(profile as any).chinese && <button className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: (profile as any).chinese, desc: CHINESE_FULL[(profile as any).chinese] || "A Chinese zodiac temperament.", icon: <ChineseZodiacIcon animal={(profile as any).chinese} size={26} />, color: "#FF8A80" }); }} style={{ background: "rgba(255,138,128,0.1)", border: "1px solid rgba(255,138,128,0.2)", color: "var(--coral)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><ChineseZodiacIcon animal={(profile as any).chinese} size={12} /> {(profile as any).chinese}</button>}
                                  {(profile as any).lifePath && <button className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: `Life Path ${(profile as any).lifePath}`, desc: LIFE_PATH_FULL[String((profile as any).lifePath)] || "A numerology life path number.", icon: <LifePathIcon n={Number((profile as any).lifePath)} size={26} />, color: "#98FB98" }); }} style={{ background: "rgba(152,251,152,0.1)", border: "1px solid rgba(152,251,152,0.2)", color: "var(--mint)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><LifePathIcon n={Number((profile as any).lifePath)} size={12} /> Life Path {(profile as any).lifePath}</button>}
                                  {(profile as any).connection && <button className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: ({ collab: "Collaborator", partner: "Partner", friend: "Friend", mentor: "Mentor" } as any)[(profile as any).connection] || "Connection", desc: CONN_FULL[(profile as any).connection] || "A connection type.", icon: ({ collab: "🤝", partner: "💼", friend: "👋", mentor: "🎓" } as any)[(profile as any).connection] || "🔗", color: "#87CEEB" }); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text2)", cursor: "pointer" }}>{({ collab: "🤝 Collab", partner: "💼 Partner", friend: "👋 Friend", mentor: "🎓 Mentor" } as any)[(profile as any).connection] || (profile as any).connection}</button>}
                                </div>
                              </div>
                              {(profile as any).zodiac && (
                                <div className="card-section">
                                  <div className="card-section-title">Astrology</div>
                                  <div className="card-section-text" style={{ lineHeight: 1.6 }}>
                                    <div style={{ marginBottom: 6 }}><strong style={{ color: "var(--lavender)" }}>{({ Aries: "♈ Aries, The Pioneer", Taurus: "♉ Taurus, The Builder", Gemini: "♊ Gemini, The Communicator", Cancer: "♋ Cancer, The Nurturer", Leo: "♌ Leo, The Performer", Virgo: "♍ Virgo, The Analyst", Libra: "♎ Libra, The Diplomat", Scorpio: "♏ Scorpio, The Strategist", Sagittarius: "♐ Sagittarius, The Explorer", Capricorn: "♑ Capricorn, The Achiever", Aquarius: "♒ Aquarius, The Visionary", Pisces: "♓ Pisces, The Dreamer" } as any)[(profile as any).zodiac] || (profile as any).zodiac}</strong></div>
                                    <div style={{ fontSize: 12, color: "var(--text2)" }}>{({ Aries: "Bold, ambitious, and always first to try something new. Natural leader energy.", Taurus: "Reliable, patient, and deeply creative. Values quality over quantity.", Gemini: "Versatile, expressive, and quick-witted. Thrives on variety.", Cancer: "Intuitive, emotional, and protective. Creates safe spaces for others.", Leo: "Creative, passionate, and generous. Natural performer and collaborator.", Virgo: "Analytical, practical, and detail-oriented. Brings precision to every project.", Libra: "Balanced, social, and artistic. Sees beauty in everything.", Scorpio: "Resourceful, brave, and passionate. Deep focus and intensity.", Sagittarius: "Generous, idealistic, and adventurous. Always exploring new horizons.", Capricorn: "Responsible, disciplined, and ambitious. Builds lasting things.", Aquarius: "Progressive, original, and independent. Thinks outside the box.", Pisces: "Compassionate, artistic, and intuitive. Feels deeply and creates freely." } as any)[(profile as any).zodiac] || ""}</div>
                                  </div>
                                </div>
                              )}
                              <div className="card-section">
                                <div className="card-section-title">Portfolio</div>
                                {(() => {
                                  const albumPhotos = cardAlbumIdx > 0 ? cardAlbumPhotos : allPhotos;
                                  const portIdx = Math.min(portfolioPhotoIdx, albumPhotos.length - 1);
                                  if (!albumPhotos.length) return <div style={{ fontSize: 12, color: "var(--muted)" }}>No portfolio photos</div>;
                                  return (
                                    <div>
                                      {cardAlbums.length > 0 && (
                                        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6, paddingTop: 2, marginBottom: 8, scrollbarWidth: "none" }}>
                                          <button onClick={(e) => { e.stopPropagation(); setCardAlbumIdx(0); setPortfolioPhotoIdx(0); }} style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 99, border: "1px solid", borderColor: cardAlbumIdx === 0 ? "var(--gold)" : "rgba(255,255,255,0.08)", background: cardAlbumIdx === 0 ? "rgba(255,215,0,0.12)" : "transparent", color: cardAlbumIdx === 0 ? "var(--gold)" : "var(--text2)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
                                          {cardAlbums.map((a, i) => <button key={a.id} onClick={(e) => { e.stopPropagation(); setCardAlbumIdx(i + 1); setPortfolioPhotoIdx(0); }} style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 99, border: "1px solid", borderColor: cardAlbumIdx === i + 1 ? "var(--gold)" : "rgba(255,255,255,0.08)", background: cardAlbumIdx === i + 1 ? "rgba(255,215,0,0.12)" : "transparent", color: cardAlbumIdx === i + 1 ? "var(--gold)" : "var(--text2)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{a.title}</button>)}
                                        </div>
                                      )}
                                      <div
                                        style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "3/4", background: "rgba(255,255,255,0.03)", cursor: "pointer" }}
                                        onClick={() => { setLightboxPhotos(albumPhotos); setLightboxIdx(portIdx); }}
                                      >
                                         <Image loading="lazy" src={albumPhotos[portIdx]} alt="Photo" fill sizes="(max-width: 600px) 50vw, 300px" style={{ objectFit: "cover", filter: (profile as any).nsfw && !revealedNsfw.has(String(profile.id)) ? "blur(26px) brightness(0.7)" : "none", transition: "filter .3s" }} onError={handleImgError} />
                                        {(profile as any).nsfw && !revealedNsfw.has(String(profile.id)) && (
                                           <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setRevealedNsfw(prev => { const n = new Set(prev); n.add(String(profile.id)); return n; }); } }} onClick={(e) => { e.stopPropagation(); setRevealedNsfw(prev => { const n = new Set(prev); n.add(String(profile.id)); return n; }); }} style={{ position: "absolute", inset: 0, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(10,6,18,0.45)", cursor: "pointer" }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: "#ff8a80" }}>18+</div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 0.03 }}>NSFW content</div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Tap to reveal</div>
                                          </div>
                                        )}
                                        {/* Tap zones */}
                                        {albumPhotos.length > 1 && (
                                          <>
                                             <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setPortfolioPhotoIdx(p => Math.max(0, p - 1)); } }} onClick={(e) => { e.stopPropagation(); setPortfolioPhotoIdx(p => Math.max(0, p - 1)); }} style={{ position: "absolute", left: 0, top: 0, width: "30%", height: "100%", zIndex: 2 }} />
                                             <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setPortfolioPhotoIdx(p => Math.min(albumPhotos.length - 1, p + 1)); } }} onClick={(e) => { e.stopPropagation(); setPortfolioPhotoIdx(p => Math.min(albumPhotos.length - 1, p + 1)); }} style={{ position: "absolute", right: 0, top: 0, width: "30%", height: "100%", zIndex: 2 }} />
                                          </>
                                        )}
                                        {/* Left/Right arrows */}
                                        {albumPhotos.length > 1 && (
                                          <>
                                            <button onClick={(e) => { e.stopPropagation(); setPortfolioPhotoIdx(p => Math.max(0, p - 1)); }} style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, cursor: "pointer", zIndex: 3, backgroundImage: "linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)", backgroundSize: "300% 300%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: "34px", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }}>‹</button>
                                            <button onClick={(e) => { e.stopPropagation(); setPortfolioPhotoIdx(p => Math.min(albumPhotos.length - 1, p + 1)); }} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, cursor: "pointer", zIndex: 3, backgroundImage: "linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)", backgroundSize: "300% 300%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: "34px", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }}>›</button>
                                          </>
                                        )}
                                      </div>
                                      {/* Dot indicators */}
                                      {albumPhotos.length > 1 && (
                                        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
                                          {albumPhotos.map((_: string, i: number) => (
                                             <div key={i} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setPortfolioPhotoIdx(i); } }} onClick={(e) => { e.stopPropagation(); setPortfolioPhotoIdx(i); }} style={{ width: 6, height: 6, borderRadius: "50%", background: i === portIdx ? "var(--gold)" : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "all .2s" }} />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="match-score" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><div className="score-bar" style={{ flex: 1 }}><div className="score-fill" style={{ width: profile.score + "%" }} /></div><span className="score-text">{profile.score}%</span>{(profile as any).matchReasons?.length > 0 && <button onClick={(e) => { e.stopPropagation(); setWhyInfo({ score: profile.score, reasons: (profile as any).matchReasons }); }} aria-label="Why this match?" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, flexShrink: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "var(--muted)", cursor: "pointer", padding: 0 }}><FiInfo size={12} /></button>}</div>
                              {(profile as any).badges?.length > 0 && <div className="card-section"><div className="card-section-title">Badges</div><div className="card-section-tags">{(profile as any).badges.map((b: any, i: number) => <button key={i} className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo(b); }} style={{ background: `${b.color}20`, border: `1px solid ${b.color}40`, color: b.color, cursor: "pointer" }}>{b.icon} {b.name}</button>)}</div></div>}
                              <div className="card-section" style={{ fontSize: 12, color: "var(--muted)" }}>📍 {profile.loc}</div>
                            </div>
                          </div>
                          {isTop && <div className={"match-fab-blur" + (showMatchMenu ? " open" : "")} aria-hidden="true" />}
                          {isTop && (
                            <div className={"match-fab" + (cardScrolled ? " hidden" : "")}>
                              <button className={"match-fab-btn" + (showMatchMenu ? " open" : "")} onClick={() => setShowMatchMenu(v => !v)} aria-label="Match actions" style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{showMatchMenu ? <FiCamera size={28} /> : "M"}</button>
                              <div className={"match-radial" + (showMatchMenu ? " open" : "")}>
                                <button className="match-radial-btn btn-rewind" style={{ left: -110, top: 7 }} onClick={doRewind} aria-label="Rewind">↺</button>
                                <button className="match-radial-btn btn-nope" style={{ left: -106, top: -40 }} onClick={() => doSwipe("left")} aria-label="Pass">✕</button>
                                <button className="match-radial-btn btn-super" style={{ left: -77, top: -77, width: 37, height: 37, fontSize: 16 }} onClick={() => doSwipe("super")} aria-label="Super Like">★</button>
                                <button className="match-radial-btn btn-like" style={{ left: -40, top: -106, width: 44, height: 44, flexDirection: "column", fontSize: 16, lineHeight: 1 }} onClick={() => handleAnchorLike({ type: "photo", value: `Photo #${(currentPhotoIdx ?? 0) + 1}` })} aria-label="Like this match"><span aria-hidden="true" style={{ fontSize: 18 }}>♥</span><span style={{ fontSize: 9, fontWeight: 800, marginTop: 1 }}>like</span></button>
                                <button className="match-radial-btn btn-note" style={{ left: 7, top: -110 }} onClick={() => doLikeWithNote()} aria-label="Like + Note">✎</button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
              {!isLoading && currentIdx >= filteredProfiles.length && (
                <EmptyState icon={<FiFilter size={44} />} title="No matches here" sub="Try widening your filters or resetting the deck">
                  <button className="btn btn-gold" onClick={() => { setCurrentIdx(0); }}>Reset</button>
                </EmptyState>
              )}
            </div>
            {!isUnlimited && (dailyLikes < 10 || superLikes < 3) && <div className="limit-bars">{dailyLikes < 10 && <div className="limit-bar"><div className="limit-dots">{Array.from({ length: 10 }, (_, i) => <div key={i} className={"limit-dot" + (i < dailyLikes ? " filled" : "")} />)}</div><div className="limit-text">{dailyLikes} likes left</div></div>}{superLikes < 3 && <div className="limit-bar"><div className="limit-dots">{Array.from({ length: 3 }, (_, i) => <div key={i} className={"limit-dot" + (i < superLikes ? " super-filled" : "")} />)}</div><div className="limit-text">{superLikes} super likes left</div></div>}</div>}
            {isUnlimited && <div className="limit-bar" style={{ background: "rgba(10,6,18,0.55)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 99, padding: "6px 16px", marginTop: 0, position: "absolute", top: 8, left: 12, zIndex: 20, backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}><div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: 0.5 }}>∞ Unlimited</div></div>}
          </>
        )}
      </div>
      <>
      {galleryView && (
        <div className="gallery-view" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGalleryView(null); } }} onClick={() => setGalleryView(null)}>
          <button className="gallery-view-close" onClick={(e) => { e.stopPropagation(); setGalleryView(null); }} aria-label="Close"><FiX size={22} /></button>
          {galleryView.photos.length > 1 && (
            <>
              <button className="gallery-view-nav gallery-view-prev" onClick={(e) => { e.stopPropagation(); setGalleryView((v: any) => v ? { ...v, idx: (v.idx - 1 + v.photos.length) % v.photos.length } : v); }} aria-label="Previous"><FiChevronRight size={26} style={{ transform: "rotate(180deg)" }} /></button>
              <button className="gallery-view-nav gallery-view-next" onClick={(e) => { e.stopPropagation(); setGalleryView((v: any) => v ? { ...v, idx: (v.idx + 1) % v.photos.length } : v); }} aria-label="Next"><FiChevronRight size={26} /></button>
            </>
          )}
          <div className="gallery-view-img-wrap" onClick={(e) => { e.stopPropagation(); }}>
            {/* .gallery-view-img-wrap is a definite-sized (100% x 78%), now
                position:relative box purely for centering/letterboxing a photo
                whose own aspect ratio varies -- a safe `fill` target unlike the
                other variable-ratio photos in this file. object-fit/border-radius/
                box-shadow keep coming from the existing `.gallery-view-img-wrap img`
                CSS rule. */}
            <Image loading="lazy" src={galleryView.photos[galleryView.idx]} alt={galleryView.name} fill sizes="100vw" onError={handleImgError} />
          </div>
          <div className="gallery-view-meta">
            <div className="gallery-view-name">{galleryView.name}</div>
            <div className="gallery-view-count">{galleryView.idx + 1} / {galleryView.photos.length}</div>
          </div>
        </div>
      )}
      {/* Lightbox */}
      {lightboxPhotos.length > 0 && (
        <Lightbox
          photos={lightboxPhotos}
          idx={lightboxIdx}
          onClose={() => { setLightboxPhotos([]); setLightboxIdx(0); }}
          onNavigate={(i) => setLightboxIdx(i)}
          onError={handleImgError}
        />
      )}
      {/* Badge info popover */}
      {badgeInfo && (
        <div role="presentation" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setBadgeInfo(null)}>
          <div style={{ background: "#1a0a2e", border: `1px solid ${badgeInfo.color}40`, borderRadius: 20, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: `${badgeInfo.color}20`, border: `1px solid ${badgeInfo.color}40`, color: badgeInfo.color, flexShrink: 0 }}>{badgeInfo.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{badgeInfo.name}</div>
            </div>
            <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>{badgeInfo.desc}</div>
            <button onClick={() => setBadgeInfo(null)} style={{ marginTop: 18, width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,rgba(255,69,0,0.25),rgba(255,215,0,0.15))", color: "var(--gold)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Got it</button>
          </div>
        </div>
      )}
      {/* Why this match? popover — traces the score back to the real calcMatch factors */}
      {whyInfo && (
        <div role="presentation" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setWhyInfo(null)}>
          <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 20, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.3)", color: "var(--gold)", flexShrink: 0 }}>{whyInfo.score}%</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Why this match?</div>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {whyInfo.reasons.map((r, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--gold)", flexShrink: 0 }}>✦</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setWhyInfo(null)} style={{ marginTop: 18, width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,rgba(255,69,0,0.25),rgba(255,215,0,0.15))", color: "var(--gold)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Got it</button>
          </div>
        </div>
      )}
      <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
      </>
    </div>
  );
});

export default DiscoverScreen;
