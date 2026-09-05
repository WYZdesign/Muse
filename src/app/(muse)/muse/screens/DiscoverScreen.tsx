"use client";

import React, { memo, useState, useEffect } from "react";
import { FiSearch, FiSettings, FiCompass, FiZap, FiCamera, FiX, FiChevronRight, FiFilter } from "react-icons/fi";
import Nav from "../components/Nav";
import MuseMap from "../components/MuseMap";
import type { Screen, Profile } from "../components/types";
import { CITY_GEO } from "../components/types";
import { distanceMiles } from "@/app/muse-realtime";
import { PORTRAIT_IMG } from "../components/photoOrientation";
import { ensureDeviceTiltActive, getDeviceTilt, createSpatialScene } from "../hooks/useDeviceTilt";
import { attachSpatialDepth } from "../hooks/useSpatialDepth";

// ── Tag description maps (for expandable info popover) ──────────────────────
const ZODIAC_FULL: Record<string, { icon: string; tag: string; desc: string }> = {
  Aries: { icon: "♈", tag: "The Pioneer", desc: "Bold, ambitious, and first to try something new. Great at kicking off projects and rallying collaborators." },
  Taurus: { icon: "♉", tag: "The Builder", desc: "Reliable, patient, and deeply creative. Prefers quality over quantity and sees work through to a polished finish." },
  Gemini: { icon: "♊", tag: "The Communicator", desc: "Versatile, expressive, and quick-witted. Loves variety and keeps the conversation flowing on set." },
  Cancer: { icon: "♋", tag: "The Nurturer", desc: "Intuitive, emotional, and protective. Creates safe spaces where collaborators do their best work." },
  Leo: { icon: "♌", tag: "The Performer", desc: "Creative, passionate, and generous. A natural performer who brings energy and warmth to every project." },
  Virgo: { icon: "♍", tag: "The Analyst", desc: "Analytical, practical, and detail-oriented. Brings precision and polish to every frame." },
  Libra: { icon: "♎", tag: "The Diplomat", desc: "Balanced, social, and artistic. Sees beauty in everything and keeps the team in harmony." },
  Scorpio: { icon: "♏", tag: "The Strategist", desc: "Resourceful, brave, and passionate. Deep focus and intensity, fully committed to the work." },
  Sagittarius: { icon: "♐", tag: "The Explorer", desc: "Generous, idealistic, and adventurous. Always exploring new horizons and pushing creative limits." },
  Capricorn: { icon: "♑", tag: "The Achiever", desc: "Responsible, disciplined, and ambitious. Builds lasting work and delivers on time, every time." },
  Aquarius: { icon: "♒", tag: "The Visionary", desc: "Progressive, original, and independent. Thinks outside the box and invents new creative forms." },
  Pisces: { icon: "♓", tag: "The Dreamer", desc: "Compassionate, artistic, and intuitive. Feels deeply and creates freely, the soul of any project." },
};

const MBTI_FULL: Record<string, { tag: string; desc: string }> = {
  INTJ: { tag: "The Architect", desc: "Strategic, independent, and future-focused. Plans ahead and sees it through toward one clear vision." },
  INTP: { tag: "The Logician", desc: "Inventive, analytical, and endlessly curious. Takes ideas apart and rebuilds them better." },
  ENTJ: { tag: "The Commander", desc: "Bold, decisive, a natural leader. Rallies teams and drives projects to the finish on time." },
  ENTP: { tag: "The Debater", desc: "Quick-witted idea generator who loves a challenge. Sparks fresh thinking through questions and exploration." },
  INFJ: { tag: "The Advocate", desc: "Quiet visionary with strong principles. Finds deep meaning and chases causes with steady focus." },
  INFP: { tag: "The Mediator", desc: "Idealistic and deeply creative. Turns emotion and imagination into authentic work." },
  ENFJ: { tag: "The Protagonist", desc: "Charismatic, big-hearted leader. Brings out the best in people and makes everyone feel valued." },
  ENFP: { tag: "The Campaigner", desc: "Enthusiastic, spontaneous, and endlessly social. Brings energy and possibility everywhere." },
  ISTJ: { tag: "The Logistician", desc: "Dependable, detail-oriented, and organized. Delivers clean execution and keeps every commitment." },
  ISFJ: { tag: "The Defender", desc: "Warm, careful, and protective. The steady backbone of any creative crew." },
  ESTJ: { tag: "The Executive", desc: "Efficient organizer who turns plans into reality. Runs tight, productive productions." },
  ESFJ: { tag: "The Consul", desc: "Harmonious, people-first, and conscientious. Keeps the team connected and the mood high." },
  ISTP: { tag: "The Virtuoso", desc: "Hands-on and cool under pressure. Solves problems on the fly with calm precision." },
  ISFP: { tag: "The Adventurer", desc: "Artistic, spontaneous, and in the moment. Creates beauty and lives by what looks and feels right." },
  ESTP: { tag: "The Entrepreneur", desc: "Bold, energetic, and pragmatic. Thrives on set and makes fast decisions with style." },
  ESFP: { tag: "The Entertainer", desc: "Lively, expressive, and magnetic. Brings the show, and the crowd, to every project." },
};

const CHINESE_FULL: Record<string, string> = {
  Rat: "Quick-witted, resourceful, and adaptable. Spots opportunity everywhere and moves fast.",
  Ox: "Steadfast, reliable, and methodical. The dependable worker who never quits.",
  Tiger: "Courageous, competitive, and magnetic. Brings fearless energy to every project.",
  Rabbit: "Graceful, diplomatic, and gentle. Prefers harmony and quiet excellence over noise.",
  Dragon: "Charismatic, ambitious, and confident. A natural showstopper who leads with flair.",
  Snake: "Wise, intuitive, and thoughtful. Moves with calm, calculated precision.",
  Horse: "Energetic, independent, and spirited. Chases freedom and creative adventure.",
  Goat: "Creative, gentle, and aesthetic. Nurtures beauty and calm in every project.",
  Monkey: "Clever, playful, and inventive. Finds smart solutions and keeps things fun.",
  Rooster: "Confident, observant, and exacting. Proud of the craft and detail-oriented.",
  Dog: "Loyal, honest, and protective. A true collaborator you can always count on.",
  Pig: "Generous, warm, and sincere. Brings heart and authenticity to every project.",
};

const LIFE_PATH_FULL: Record<string, string> = {
  "1": "The Leader, independent, ambitious, a born starter. Pioneers new directions.",
  "2": "The Diplomat, sensitive and cooperative, the glue of any collaboration.",
  "3": "The Creative, expressive and joyful, a natural communicator and artist.",
  "4": "The Builder, disciplined and reliable, a master of structure and solid work.",
  "5": "The Freedom Seeker, versatile and restless, drawn to adventure and trying new things.",
  "6": "The Nurturer, responsible and loving, makes collaborators feel supported and safe.",
  "7": "The Seeker, analytical and reflective, digs deep for meaning and truth.",
  "8": "The Powerhouse, driven and commanding, turns ambition into real success.",
  "9": "The Humanitarian, compassionate and wise, makes work that serves a bigger purpose.",
  "11": "The Illuminator, a Master Number. Deeply intuitive and inspired, a channel for big ideas.",
  "22": "The Master Builder, a Master Number. Dreams on a huge scale, with the focus to actually build it.",
  "33": "The Master Teacher, a Master Number. The rare healer who lifts up everyone around them.",
};

const STYLE_FULL: Record<string, string> = {
  Portrait: "Focused on the person, their face, form, and expression.",
  Editorial: "Magazine-style storytelling images with a narrative thread.",
  Commercial: "Brand and advertising work built to sell a product or idea.",
  "Music Video": "Moving images synced to music, performance, and rhythm.",
  Documentary: "Real, unscripted storytelling, the truth caught on camera.",
  Branding: "Visual identity, logos, and cohesive brand systems.",
  "Body Art": "Fine-art figure and body-paint photography of the human form.",
  "Fine Art": "Gallery-minded imagery that puts concept and emotion first.",
  Fashion: "Work centered on clothing, style, and the runway.",
  Experimental: "Unconventional, boundary-pushing approaches to image and film.",
  Dark: "Moody, dramatic, low-key visuals with strong contrast.",
  Dreamy: "Soft, ethereal, romantic visuals with hazy light.",
  Bold: "High-impact, saturated, unapologetically striking images.",
  Vintage: "Retro, film-inspired visuals with a warm, nostalgic feel.",
  Abstract: "Art focused on form, color, and texture rather than a subject.",
  Film: "Moving-picture work like narrative, short, and feature film.",
};

const CONN_FULL: Record<string, string> = {
  collab: "Wants to make work together, like a project, a shoot, or a commission.",
  partner: "Open to a deeper romantic or creative-life partnership.",
  friend: "Looking for creative community and real friendship, not just work.",
  mentor: "Seeking guidance, teaching, or someone to learn from, or to be that for someone else.",
};

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
  doLikeWithNote?: () => void;
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
  const [badgeInfo, setBadgeInfo] = useState<{ name: string; desc: string; icon: string; color: string } | null>(null);
  const [revealedNsfw, setRevealedNsfw] = useState<Set<string>>(new Set());

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

  const prefsActive = !!(discoveryPrefs && (Number(discoveryPrefs.ageMin) !== 18 || Number(discoveryPrefs.ageMax) !== 50 || Number(discoveryPrefs.distance) !== 50 || discoveryPrefs.gender !== "all"));

  return (
    <div className={"screen-el" + (screen === "discover" ? " active" : "")}>
      <div className="discover-wrap">
        <div className="hdr">
          <div className="logo-link" style={{ fontSize: 32, backgroundImage: "linear-gradient(90deg,#FFD700,#FF8C69,#FFB6C1,#FFD700,#FFA07A,#FFD700)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", position: "static", left: "auto", top: "auto", transform: "none", animation: "lavaFlow 7s ease-in-out infinite,logoShimmer 4s ease-in-out infinite" }}>Discover</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 4 }}>
            {!discoverSearchOpen ? (
              <button className="hdr-btn" style={{ width: 34, height: 34 }} onClick={() => setDiscoverSearchOpen(true)} aria-label="Search"><FiSearch size={16} /></button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, animation: "fadeIn .2s ease" }}>
                <input className="inp" placeholder="Search..." value={discoverSearch} onChange={e => setDiscoverSearch(e.target.value)} autoFocus style={{ margin: 0, padding: "10px 14px", fontSize: 14, flex: 1, borderRadius: 14, minWidth: 0 }} />
                <button className="hdr-btn" aria-label="Close search" style={{ width: 30, height: 30, borderRadius: "50%", fontSize: 12 }} onClick={() => { setDiscoverSearchOpen(false); setDiscoverSearch(""); }}>✕</button>
              </div>
            )}
            {!discoverSearchOpen && (
              <>
                <button className={"hdr-btn" + (prefsActive ? " hdr-btn-glow" : "")} onClick={() => setShowDiscoveryPrefs(true)} style={{ width: 34, height: 34 }} aria-label="Discovery Preferences"><FiSettings size={16} />{prefsActive && <span style={{ position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: "50%", background: "var(--gold)", border: "1px solid var(--bg)", boxShadow: "0 0 6px rgba(255,215,0,0.8)" }} />}</button>
                <button className={"hdr-btn" + (mapView ? " hdr-btn-glow" : "")} onClick={() => setMapView(v => !v)} title="Map View" style={{ width: 34, height: 34 }} aria-label="Map View"><FiCompass size={16} /></button>
                <button className={"hdr-btn" + (boostActive ? " hdr-btn-glow" : "")} onClick={() => { if (!boostActive) { const end = Date.now() + 1800000; setBoostActive(true); setBoostEnd(end); try { safeSetItem?.("muse_boost", "" + end); } catch {} showToast("Boost on for 30 min!"); } else { setBoostActive(false); setBoostEnd(0); try { safeRemoveItem?.("muse_boost"); } catch {} showToast("Boost off"); } }} style={{ width: 34, height: 34 }} aria-label="Boost"><FiZap size={16} /></button>
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
                            <img
                              loading="lazy"
                              src={heroSrc}
                              alt={profile.name}
                              draggable="false"
                              onError={handleImgError}
                              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: heroPortrait ? "center top" : "center", background: "linear-gradient(160deg,#1a0a2e,#0a0612)", position: "absolute", top: 0, left: 0, transition: "transform 0.15s ease-out, filter 0.3s ease", transformStyle: "preserve-3d", filter: (profile as any).nsfw && !revealedNsfw.has(String(profile.id)) ? "blur(26px) brightness(0.7)" : "none" }}
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
                              {(profile as any).zodiac && <span className="card-hero-badge">{(profile as any).zodiac}</span>}
                              {(profile as any).mbti && <span className="card-hero-badge">{(profile as any).mbti}</span>}
                              {(profile as any).lifePath && <span className="card-hero-badge">LP {(profile as any).lifePath}</span>}
                              {(profile as any).chinese && <span className="card-hero-badge">{(profile as any).chinese}</span>}
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
                                  {(profile as any).mbti && <button className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: (profile as any).mbti, desc: `${MBTI_FULL[(profile as any).mbti]?.tag}. ${MBTI_FULL[(profile as any).mbti]?.desc}`, icon: "🧠", color: "#FFD700" }); }} style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)", cursor: "pointer" }}>{({ INTJ: "Architect", INTP: "Logician", ENTJ: "Commander", ENTP: "Debater", INFJ: "Advocate", INFP: "Mediator", ENFJ: "Protagonist", ENFP: "Campaigner", ISTJ: "Logistician", ISFJ: "Defender", ESTJ: "Executive", ESFJ: "Consul", ISTP: "Virtuoso", ISFP: "Adventurer", ESTP: "Entrepreneur", ESFP: "Entertainer" } as any)[(profile as any).mbti] || (profile as any).mbti} · {(profile as any).mbti}</button>}
                                  {(profile as any).chinese && <button className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: (profile as any).chinese, desc: CHINESE_FULL[(profile as any).chinese] || "A Chinese zodiac temperament.", icon: "🐉", color: "#FF8A80" }); }} style={{ background: "rgba(255,138,128,0.1)", border: "1px solid rgba(255,138,128,0.2)", color: "var(--coral)", cursor: "pointer" }}>🐉 {(profile as any).chinese}</button>}
                                  {(profile as any).lifePath && <button className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: `Life Path ${(profile as any).lifePath}`, desc: LIFE_PATH_FULL[String((profile as any).lifePath)] || "A numerology life path number.", icon: "🔢", color: "#98FB98" }); }} style={{ background: "rgba(152,251,152,0.1)", border: "1px solid rgba(152,251,152,0.2)", color: "var(--mint)", cursor: "pointer" }}>🔢 Life Path {(profile as any).lifePath}</button>}
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
                                        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6, marginBottom: 8, scrollbarWidth: "none" }}>
                                          <button onClick={(e) => { e.stopPropagation(); setCardAlbumIdx(0); setPortfolioPhotoIdx(0); }} style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 99, border: "1px solid", borderColor: cardAlbumIdx === 0 ? "var(--gold)" : "rgba(255,255,255,0.08)", background: cardAlbumIdx === 0 ? "rgba(255,215,0,0.12)" : "transparent", color: cardAlbumIdx === 0 ? "var(--gold)" : "var(--text2)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
                                          {cardAlbums.map((a, i) => <button key={a.id} onClick={(e) => { e.stopPropagation(); setCardAlbumIdx(i + 1); setPortfolioPhotoIdx(0); }} style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 99, border: "1px solid", borderColor: cardAlbumIdx === i + 1 ? "var(--gold)" : "rgba(255,255,255,0.08)", background: cardAlbumIdx === i + 1 ? "rgba(255,215,0,0.12)" : "transparent", color: cardAlbumIdx === i + 1 ? "var(--gold)" : "var(--text2)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{a.title}</button>)}
                                        </div>
                                      )}
                                      <div
                                        style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "3/4", background: "rgba(255,255,255,0.03)", cursor: "pointer" }}
                                        onClick={() => { setLightboxPhotos(albumPhotos); setLightboxIdx(portIdx); }}
                                      >
                                         <img loading="lazy" src={albumPhotos[portIdx]} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover", filter: (profile as any).nsfw && !revealedNsfw.has(String(profile.id)) ? "blur(26px) brightness(0.7)" : "none", transition: "filter .3s" }} onError={handleImgError} />
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
                              <div className="match-score" style={{ marginBottom: 16 }}><div className="score-bar"><div className="score-fill" style={{ width: profile.score + "%" }} /></div><span className="score-text">{profile.score}%</span></div>
                              {(profile as any).badges?.length > 0 && <div className="card-section"><div className="card-section-title">Badges</div><div className="card-section-tags">{(profile as any).badges.map((b: any, i: number) => <button key={i} className="tag" onClick={(e) => { e.stopPropagation(); setBadgeInfo(b); }} style={{ background: `${b.color}20`, border: `1px solid ${b.color}40`, color: b.color, cursor: "pointer" }}>{b.icon} {b.name}</button>)}</div></div>}
                              <div className="card-section" style={{ fontSize: 12, color: "var(--muted)" }}>📍 {profile.loc}</div>
                            </div>
                          </div>
                          {isTop && (
                            <div className={"match-fab" + (cardScrolled ? " hidden" : "")}>
                              <button className={"match-fab-btn" + (showMatchMenu ? " open" : "")} onClick={() => setShowMatchMenu(v => !v)} aria-label="Match actions" style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{showMatchMenu ? <FiCamera size={28} /> : "M"}</button>
                              <div className={"match-radial" + (showMatchMenu ? " open" : "")}>
                                <button className="match-radial-btn btn-rewind" style={{ left: -110, top: 7 }} onClick={doRewind} aria-label="Rewind">↺</button>
                                <button className="match-radial-btn btn-nope" style={{ left: -106, top: -40 }} onClick={() => doSwipe("left")} aria-label="Pass">✕</button>
                                <button className="match-radial-btn btn-super" style={{ left: -77, top: -77, width: 37, height: 37, fontSize: 16 }} onClick={() => doSwipe("super")} aria-label="Super Like">★</button>
                                <button className="match-radial-btn btn-like" style={{ left: -40, top: -106 }} onClick={() => doSwipe("right")} aria-label="Like">♥</button>
                                <button className="match-radial-btn btn-note" style={{ left: 7, top: -110 }} onClick={doLikeWithNote} aria-label="Like + Note">✎</button>
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
                <div className="empty-state">
                  <div className="empty-icon"><FiFilter size={44} /></div>
                  <div className="empty-title">No matches here</div>
                  <div className="empty-sub">Try widening your filters or resetting the deck</div>
                  <button className="btn btn-gold" onClick={() => { setCurrentIdx(0); }}>Reset</button>
                </div>
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
            <img loading="lazy" src={galleryView.photos[galleryView.idx]} alt={galleryView.name} onError={handleImgError} />
          </div>
          <div className="gallery-view-meta">
            <div className="gallery-view-name">{galleryView.name}</div>
            <div className="gallery-view-count">{galleryView.idx + 1} / {galleryView.photos.length}</div>
          </div>
        </div>
      )}
      {/* Lightbox */}
      {lightboxPhotos.length > 0 && (
        <div role="presentation" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setLightboxPhotos([]); setLightboxIdx(0); }}>
          <button onClick={(e) => { e.stopPropagation(); setLightboxPhotos([]); setLightboxIdx(0); }} aria-label="Close" style={{ position: "absolute", top: 16, right: 16, zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>✕</button>
          {lightboxPhotos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length); }} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 22 }}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % lightboxPhotos.length); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 22 }}>›</button>
            </>
          )}
           <img src={lightboxPhotos[lightboxIdx] || lightboxPhotos[0]} alt="Photo" style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" }} onClick={(e) => e.stopPropagation()} onError={handleImgError} />
          <div style={{ position: "absolute", bottom: 20, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{lightboxIdx + 1} / {lightboxPhotos.length}</div>
        </div>
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
      <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
      </>
    </div>
  );
});

export default DiscoverScreen;
