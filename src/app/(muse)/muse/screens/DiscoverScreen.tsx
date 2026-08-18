"use client";

import React, { memo, useState } from "react";
import { FiSearch, FiSettings, FiFilter, FiCompass, FiZap, FiCamera, FiX, FiChevronRight } from "react-icons/fi";
import Nav from "../components/Nav";
import MuseMap from "../components/MuseMap";
import type { Screen, Profile } from "../components/types";
import { PORTRAIT_IMG } from "../components/photoOrientation";

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
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string) => void;
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
  cardScrollRef?: React.RefObject<HTMLDivElement | null>;
}

export const DiscoverScreen = memo(function DiscoverScreen({
  screen,
  discoverSearchOpen,
  setDiscoverSearchOpen,
  discoverSearch,
  setDiscoverSearch,
  setShowDiscoveryPrefs,
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
  myGeo,
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
  cardScrollRef,
}: DiscoverScreenProps) {
  const [badgeInfo, setBadgeInfo] = useState<{ name: string; desc: string; icon: string; color: string } | null>(null);
  return (
    <div className={"screen-el" + (screen === "discover" ? " active" : "")}>
      <div className="discover-wrap">
        <div className="hdr">
          <div className="logo-link" style={{ fontSize: 32, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Discover</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 4 }}>
            {!discoverSearchOpen ? (
              <button className="hdr-btn" style={{ width: 34, height: 34 }} onClick={() => setDiscoverSearchOpen(true)} aria-label="Search"><FiSearch size={16} /></button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, animation: "fadeIn .2s ease" }}>
                <input className="inp" placeholder="Search..." value={discoverSearch} onChange={e => setDiscoverSearch(e.target.value)} autoFocus style={{ margin: 0, padding: "6px 10px", fontSize: 12, width: 120, borderRadius: 99 }} />
                <button className="hdr-btn" style={{ width: 30, height: 30, borderRadius: "50%", fontSize: 12 }} onClick={() => { setDiscoverSearchOpen(false); setDiscoverSearch(""); }}>✕</button>
              </div>
            )}
            {!discoverSearchOpen && (
              <>
                <button className="hdr-btn" onClick={() => setShowDiscoveryPrefs(true)} style={{ width: 34, height: 34 }} aria-label="Discovery Preferences"><FiSettings size={16} /></button>
                <button className="hdr-btn" onClick={() => setShowFilterModal(true)} style={{ width: 34, height: 34 }} aria-label="Filter"><FiFilter size={16} /></button>
                <button className="hdr-btn" onClick={() => setMapView(v => !v)} title="Map View" style={{ width: 34, height: 34 }} aria-label="Map View"><FiCompass size={16} /></button>
                <button className={"hdr-btn" + (boostActive ? " hdr-btn-glow" : "")} onClick={() => { if (!boostActive) { const end = Date.now() + 1800000; setBoostActive(true); setBoostEnd(end); try { safeSetItem?.("muse_boost", "" + end); } catch {} showToast("Boost on for 30 min!"); } else { setBoostActive(false); setBoostEnd(0); try { safeRemoveItem?.("muse_boost"); } catch {} showToast("Boost off"); } }} style={{ width: 34, height: 34 }} aria-label="Boost"><FiZap size={16} /></button>
              </>
            )}
          </div>
        </div>
        {mapView && <MuseMap filteredProfiles={filteredProfiles as any} myGeo={myGeo ? { lat: myGeo.lat, lng: myGeo.long } : undefined} onClose={() => setMapView(false)} />}
        {!mapView && (
          <>
            <div className="card-stack" role="application" aria-label="Swipe cards to discover creatives" aria-roledescription="card carousel">
              {filteredProfiles.slice(currentIdx, currentIdx + 3).map((profile, idx) => {
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
                      const allPhotos: string[] = (profile as any).photos?.length ? (profile as any).photos : [profile.img];
                      const portraitPics = allPhotos.filter((p: string) => !!PORTRAIT_IMG[p]);
                      const landscapePics = allPhotos.filter((p: string) => !PORTRAIT_IMG[p]);
                      const photos: string[] = [...portraitPics, ...landscapePics].slice(0, 6);
                      if (photos.length < 4) photos.push(...allPhotos.slice(0, Math.max(0, 4 - photos.length)));
                      const heroSrc = photos[currentPhotoIdx ?? 0] || profile.img;
                      const heroPortrait = !!PORTRAIT_IMG[heroSrc];
                      return (
                        <>
                          <div
                            className="card-hero"
                            ref={heroRef as any}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = (e.clientX - rect.left) / rect.width - 0.5;
                              const y = (e.clientY - rect.top) / rect.height - 0.5;
                              const img = e.currentTarget.querySelector("img") as HTMLImageElement;
                              if (img) img.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
                            }}
                            onMouseLeave={(e) => {
                              const img = e.currentTarget.querySelector("img") as HTMLImageElement;
                              if (img) img.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
                            }}
                          >
                            <img
                              loading="lazy"
                              src={heroSrc}
                              alt={profile.name}
                              draggable="false"
                              onError={handleImgError}
                              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: heroPortrait ? "center top" : "center", background: "linear-gradient(160deg,#1a0a2e,#0a0612)", position: "absolute", top: 0, left: 0, transition: "transform 0.15s ease-out", transformStyle: "preserve-3d" }}
                            />
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
                            <div className="card-hero-type">{profile.type} · {profile.loc?.split(",")[0]}</div>
                          </div>
                          {isTop && (
                            <>
                              <div className={"card-photo-zone card-photo-zone-left" + (cardScrolled ? " hidden" : "")} style={{ pointerEvents: cardScrolled ? "none" : "auto" }} onClick={(e) => { e.stopPropagation(); setCurrentPhotoIdx?.(prev => Math.max(0, prev - 1)); }}><span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundImage: "linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)", backgroundSize: "300% 300%", animation: "dotLava 3s ease-in-out infinite", pointerEvents: "none", lineHeight: "28px" }}>‹</span></div>
                              <div className={"card-photo-zone card-photo-zone-right" + (cardScrolled ? " hidden" : "")} style={{ pointerEvents: cardScrolled ? "none" : "auto" }} onClick={(e) => { e.stopPropagation(); setCurrentPhotoIdx?.(prev => Math.min(photos.length - 1, prev + 1)); }}><span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundImage: "linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)", backgroundSize: "300% 300%", animation: "dotLava 3s ease-in-out infinite", pointerEvents: "none", lineHeight: "28px" }}>›</span></div>
                            </>
                          )}
                          <div className={"card-photo-dots" + (cardScrolled ? " hidden" : "")}>
                            {photos.map((_: string, i: number) => <div key={i} className={"card-photo-dot" + (i === currentPhotoIdx ? " active" : "")} />)}
                          </div>
                          {showNoteTooltip && (
                            <div style={{ textAlign: "center", padding: "4px 16px 0", animation: "tooltipIn .4s ease" }}>
                              <div style={{ display: "inline-block", background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "var(--text2)", maxWidth: 280 }}>
                                💬 <b>Send a note</b> with your like to stand out — introduce yourself or mention why you want to connect.
                                <button onClick={() => { setShowNoteTooltip?.(false); safeSetItem?.("muse_note_seen", "1"); }} style={{ display: "block", width: "100%", marginTop: 6, background: "none", border: "none", color: "var(--gold)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Got it</button>
                              </div>
                            </div>
                          )}
                          {isTop && (
                            <>
                              <div ref={likeLabelRef as any} className="label label-like">LIKE</div>
                              <div ref={nopeLabelRef as any} className="label label-nope">NOPE</div>
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
                              {profile.looking.length > 0 && <div className="card-section"><div className="card-section-title">Looking for</div><div className="card-section-text">{profile.looking.join(", ")}</div></div>}
                              <div className="card-section"><div className="card-section-title">Creative Style</div>
                                <div className="card-section-tags">{profile.styles.map(s => <span key={s} className="tag">{s}</span>)}</div>
                              </div>
                              <div className="card-section">
                                <div className="card-section-title">Personality</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {(profile as any).zodiac && <span className="tag" style={{ background: "rgba(212,165,255,0.12)", border: "1px solid rgba(212,165,255,0.25)", color: "var(--lavender)" }}>{({ Aries: "♈ Aries", Taurus: "♉ Taurus", Gemini: "♊ Gemini", Cancer: "♋ Cancer", Leo: "♌ Leo", Virgo: "♍ Virgo", Libra: "♎ Libra", Scorpio: "♏ Scorpio", Sagittarius: "♐ Sagittarius", Capricorn: "♑ Capricorn", Aquarius: "♒ Aquarius", Pisces: "♓ Pisces" } as any)[(profile as any).zodiac] || (profile as any).zodiac}</span>}
                                  {(profile as any).mbti && <span className="tag" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)" }}>{({ INTJ: "Architect", INTP: "Logician", ENTJ: "Commander", ENTP: "Debater", INFJ: "Advocate", INFP: "Mediator", ENFJ: "Protagonist", ENFP: "Campaigner", ISTJ: "Logistician", ISFJ: "Defender", ESTJ: "Executive", ESFJ: "Consul", ISTP: "Virtuoso", ISFP: "Adventurer", ESTP: "Entrepreneur", ESFP: "Entertainer" } as any)[(profile as any).mbti] || (profile as any).mbti} · {(profile as any).mbti}</span>}
                                  {(profile as any).chinese && <span className="tag" style={{ background: "rgba(255,138,128,0.1)", border: "1px solid rgba(255,138,128,0.2)", color: "var(--coral)" }}>🐉 {(profile as any).chinese}</span>}
                                  {(profile as any).lifePath && <span className="tag" style={{ background: "rgba(152,251,152,0.1)", border: "1px solid rgba(152,251,152,0.2)", color: "var(--mint)" }}>🔢 Life Path {(profile as any).lifePath}</span>}
                                  {(profile as any).connection && <span className="tag" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text2)" }}>{({ collab: "🤝 Collab", partner: "💼 Partner", friend: "👋 Friend", mentor: "🎓 Mentor" } as any)[(profile as any).connection] || (profile as any).connection}</span>}
                                </div>
                              </div>
                              {(profile as any).zodiac && (
                                <div className="card-section">
                                  <div className="card-section-title">Astrology</div>
                                  <div className="card-section-text" style={{ lineHeight: 1.6 }}>
                                    <div style={{ marginBottom: 6 }}><strong style={{ color: "var(--lavender)" }}>{({ Aries: "♈ Aries — The Pioneer", Taurus: "♉ Taurus — The Builder", Gemini: "♊ Gemini — The Communicator", Cancer: "♋ Cancer — The Nurturer", Leo: "♌ Leo — The Performer", Virgo: "♍ Virgo — The Analyst", Libra: "♎ Libra — The Diplomat", Scorpio: "♏ Scorpio — The Strategist", Sagittarius: "♐ Sagittarius — The Explorer", Capricorn: "♑ Capricorn — The Achiever", Aquarius: "♒ Aquarius — The Visionary", Pisces: "♓ Pisces — The Dreamer" } as any)[(profile as any).zodiac] || (profile as any).zodiac}</strong></div>
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
                                        <img loading="lazy" src={albumPhotos[portIdx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={handleImgError} />
                                        {/* Tap zones */}
                                        {albumPhotos.length > 1 && (
                                          <>
                                            <div onClick={(e) => { e.stopPropagation(); setPortfolioPhotoIdx(p => Math.max(0, p - 1)); }} style={{ position: "absolute", left: 0, top: 0, width: "30%", height: "100%", zIndex: 2 }} />
                                            <div onClick={(e) => { e.stopPropagation(); setPortfolioPhotoIdx(p => Math.min(albumPhotos.length - 1, p + 1)); }} style={{ position: "absolute", right: 0, top: 0, width: "30%", height: "100%", zIndex: 2 }} />
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
                                            <div key={i} onClick={(e) => { e.stopPropagation(); setPortfolioPhotoIdx(i); }} style={{ width: 6, height: 6, borderRadius: "50%", background: i === portIdx ? "var(--gold)" : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "all .2s" }} />
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
                                <button className="match-radial-btn btn-rewind" style={{ left: -90, top: -24 }} onClick={doRewind} aria-label="Rewind">↺</button>
                                <button className="match-radial-btn btn-nope" style={{ left: -85, top: -50 }} onClick={() => doSwipe("left")} aria-label="Pass">✕</button>
                                <button className="match-radial-btn btn-super" style={{ left: -68, top: -68, width: 37, height: 37, fontSize: 16 }} onClick={() => doSwipe("super")} aria-label="Super Like">★</button>
                                <button className="match-radial-btn btn-like" style={{ left: -50, top: -85 }} onClick={() => doSwipe("right")} aria-label="Like">♥</button>
                                <button className="match-radial-btn btn-note" style={{ left: -24, top: -90 }} onClick={doLikeWithNote} aria-label="Like + Note">✎</button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
              {currentIdx >= filteredProfiles.length && (
                <div className="empty-state">
                  <div className="empty-icon"><FiCompass size={48} /></div>
                  <div className="empty-title">All caught up!</div>
                  <div className="empty-sub">Check back later for more creatives</div>
                  <button className="btn btn-gold" onClick={() => { setCurrentIdx(0); setDailyLikes(10); setSuperLikes(3); }}>Reset</button>
                </div>
              )}
            </div>
            {!isUnlimited && (dailyLikes < 10 || superLikes < 3) && <div className="limit-bars">{dailyLikes < 10 && <div className="limit-bar"><div className="limit-dots">{Array.from({ length: 10 }, (_, i) => <div key={i} className={"limit-dot" + (i < dailyLikes ? " filled" : "")} />)}</div><div className="limit-text">{dailyLikes} likes left</div></div>}{superLikes < 3 && <div className="limit-bar"><div className="limit-dots">{Array.from({ length: 3 }, (_, i) => <div key={i} className={"limit-dot" + (i < superLikes ? " super-filled" : "")} />)}</div><div className="limit-text">{superLikes} super likes left</div></div>}</div>}
            {isUnlimited && <div className="limit-bar" style={{ background: "rgba(10,6,18,0.55)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 99, padding: "6px 16px", marginTop: 0, position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 20, backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}><div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: 0.5 }}>∞ Unlimited</div></div>}
          </>
        )}
      </div>
      {galleryView && (
        <div className="gallery-view" onClick={() => setGalleryView(null)}>
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
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setLightboxPhotos([]); setLightboxIdx(0); }}>
          <button onClick={(e) => { e.stopPropagation(); setLightboxPhotos([]); setLightboxIdx(0); }} style={{ position: "absolute", top: 16, right: 16, zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>✕</button>
          {lightboxPhotos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length); }} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 22 }}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % lightboxPhotos.length); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 22 }}>›</button>
            </>
          )}
          <img src={lightboxPhotos[lightboxIdx] || lightboxPhotos[0]} alt="" style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" }} onClick={(e) => e.stopPropagation()} onError={handleImgError} />
          <div style={{ position: "absolute", bottom: 20, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{lightboxIdx + 1} / {lightboxPhotos.length}</div>
        </div>
      )}
      {/* Badge info popover */}
      {badgeInfo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setBadgeInfo(null)}>
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
    </div>
  );
});

export default DiscoverScreen;
