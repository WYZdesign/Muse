"use client";

import React, { memo, useState } from "react";
import Image from "next/image";
import { ZODIAC_GLYPH, MbtiIcon, LifePathIcon } from "./traitIcons";
import { ZODIAC_FULL, MBTI_FULL, LIFE_PATH_FULL, BadgeInfoModal, type BadgeInfo } from "./badgeInfo";
import { viewerSide, viewerSideOf, getMuseRole, type MuseRole } from "@/lib/role";

const roleBadgeText = (role: string) => role === "muse" ? "Muse" : role === "industry" ? "Industry" : "Creative";

export interface MatchCardProps {
  m: any;
  view: "list" | "grid";
  isNew?: boolean;
  actions: {
    setExpandedMatchId: (v: string | null) => void;
    setChatTarget: (v: any) => void;
    showScreen: (s: any) => void;
    setReportTarget: (v: any) => void;
    setShowReport: (v: boolean) => void;
    setUnmatchTarget: (v: { id: string; name: string }) => void;
    setBlockTarget: (v: { id: string; name: string } | null) => void;
    handleImgError: (e: any) => void;
    getIcebreaker: (type: string, seed?: string) => string;
    setViewProfile?: (p: any) => void;
    setPublicProfileUser?: (p: any) => void;
  };
}

const AVATAR_SIZE = 78;
const RING_SIZE = 90; // wyzmind's live-verified sizing (Session 81/82 — 83 was too tight)
// Session 85: an earlier pass shrank this 15% (to 66/77) thinking "decrease the halo"
// meant diameter — Torreé clarified it meant the ring's line thickness (see
// .profile-ring in muse.css), so diameter reverted back here.
// Hoolah-hoop diameter: halo (RING_SIZE) scaled up ~8% so the hoop visibly hovers
// above/outside the halo with a real gap between them (Torreé's ask: 5-10% bigger,
// not touching). A % of RING_SIZE rather than a fixed px so the gap scales with it.
const ORBIT_SIZE = Math.round(RING_SIZE * 1.08);
const RING_SPEEDS = [3.2, 4.5, 5.8, 3.8, 5.1, 4.2, 6.0, 3.5, 4.8, 5.5];
const RING_VARIANTS = ["ring-v1", "ring-v2", "ring-v3", "ring-v4", "ring-v5", "ring-v6", "ring-v7", "ring-v8", "ring-v9", "ring-v10"];
// Hoolah-hoop color variants — matched 1:1 to RING_VARIANTS by index (see the
// .orbit-vN rules in muse.css) so a card's outer hoop is always the same palette as
// its inner halo, instead of every hoop defaulting to the same flat gold/pink mix.
const ORBIT_VARIANTS = ["orbit-v1", "orbit-v2", "orbit-v3", "orbit-v4", "orbit-v5", "orbit-v6", "orbit-v7", "orbit-v8", "orbit-v9", "orbit-v10"];
// Hoolah-hoop speeds for the outer orbit ring — deliberately offset from RING_SPEEDS
// (different array, different modulo base) so the hoop and its halo are never
// spinning in sync, and different cards' hoops visibly vary in pace from each other.
const ORBIT_SPEEDS = [7.5, 5.5, 9, 6.8, 8.2, 6.0, 7.9, 5.2, 8.6, 6.6];

const MatchCard = memo(function MatchCard({ m, view, isNew, actions }: MatchCardProps) {
  const {
    setChatTarget,
    showScreen,
    handleImgError,
  } = actions;

  // Audit fix (Torreé batch Part B item 1): the zodiac/MBTI/life-path badges
  // on Muses cards (both list and grid view) were plain, dead <span>s — the
  // same trait badges are already tap-to-detail on Discover's swipe cards.
  // Reusing that exact shared pattern here.
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
  const mid = String(m.id);
  const isList = view === "list";
  const ringSpeed = RING_SPEEDS[parseInt(mid, 10) % RING_SPEEDS.length] || 4;
  const ringIdx = parseInt(mid, 10) % RING_VARIANTS.length;
  const ringVariant = RING_VARIANTS[ringIdx] || RING_VARIANTS[0];
  const orbitVariant = ORBIT_VARIANTS[ringIdx] || ORBIT_VARIANTS[0];
  const orbitSpeed = ORBIT_SPEEDS[parseInt(mid, 10) % ORBIT_SPEEDS.length] || 7;

  // Role detection for this match
  const matchRole: MuseRole = getMuseRole({ audience: m.audience, type: m.type });
  const isMuse = matchRole === "muse";

  // NSFW gating for matched-partner avatars (previously missing entirely —
  // see get.ts's "matches" handler, the actual enforcement point). By the
  // time an nsfw avatar URL reaches this component the viewer is already
  // server-verified (get.ts strips it to "" otherwise, below), so this
  // reveal state is a consent gate on top of that, matching Discover's and
  // Chat's existing blur-then-reveal treatment of nsfw media.
  const [revealed, setRevealed] = useState(false);
  const isNsfwLocked = !!m.nsfw && !m.img; // stripped server-side: viewer isn't verified
  const isNsfwBlurred = !!m.nsfw && !!m.img && !revealed;

  return (
    <div
      data-mid={mid}
      className={isList ? "match-card" : "match-card match-card-grid"}
      onClick={() => {
        setChatTarget(m);
        showScreen("chat");
      }}
    >
      {/* "New match" vertical color tab on the right edge (list view only).
          Represents an unseen match; disappears once the user opens the chat
          (MusesScreen tracks seen ids). */}
      {isList && isNew && (
        <div className="match-new-tab" aria-label="New match" title="New match" />
      )}
      <div className="match-avatar-wrap" style={isList ? { position: "relative", width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0 } : undefined}>
        {isList && <div className={`avatar-orbit orbit-full ${orbitVariant}`} style={{ "--orbit-size": `${ORBIT_SIZE}px`, animationDuration: `${orbitSpeed}s` } as React.CSSProperties} />}
        {isList && <div className={`profile-ring ${ringVariant}`} style={{ width: RING_SIZE, height: RING_SIZE, animationDuration: `${ringSpeed}s` }} />}
        {isNsfwLocked ? (
          <div
            style={isList
              ? { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: "50%", background: "#1a0a2e", position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#ff8a80", flexDirection: "column", gap: 2 }
              : { position: "absolute", inset: 0, background: "#1a0a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#ff8a80", flexDirection: "column", gap: 3 }}
            title="Verify your identity to see this photo"
          >
            <span>🔒</span><span style={{ fontSize: 9 }}>18+</span>
          </div>
        ) : isList ? (
          <div
            role={isNsfwBlurred ? "button" : undefined}
            tabIndex={isNsfwBlurred ? 0 : undefined}
            onClick={isNsfwBlurred ? (e) => { e.stopPropagation(); setRevealed(true); } : undefined}
            onKeyDown={isNsfwBlurred ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setRevealed(true); } } : undefined}
            style={{ position: "relative", width: AVATAR_SIZE, height: AVATAR_SIZE, zIndex: 1, cursor: isNsfwBlurred ? "pointer" : undefined }}
          >
            <Image
              loading="lazy"
              src={m.img}
              alt={m.name}
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              className="match-avatar"
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: "50%", objectFit: "cover", border: "2.5px solid transparent", background: "#1a0a2e", filter: isNsfwBlurred ? "blur(10px)" : undefined, transition: "filter .2s" }}
              onError={handleImgError}
            />
            {isNsfwBlurred && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", textAlign: "center" }}>Tap to reveal</span>}
          </div>
        ) : (
          <div
            role={isNsfwBlurred ? "button" : undefined}
            tabIndex={isNsfwBlurred ? 0 : undefined}
            onClick={isNsfwBlurred ? (e) => { e.stopPropagation(); setRevealed(true); } : undefined}
            onKeyDown={isNsfwBlurred ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setRevealed(true); } } : undefined}
            style={{ position: "absolute", inset: 0, cursor: isNsfwBlurred ? "pointer" : undefined }}
          >
            <Image
              loading="lazy"
              src={m.img}
              alt={m.name}
              fill
              sizes="(max-width: 600px) 50vw, 300px"
              className="match-avatar"
              style={{ filter: isNsfwBlurred ? "blur(14px)" : undefined, transition: "filter .2s" }}
              onError={handleImgError}
            />
            {isNsfwBlurred && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", textAlign: "center", background: "rgba(0,0,0,0.15)" }}>Tap to reveal</span>}
          </div>
        )}
        {m.online && <div className="online-dot" style={{ position: "absolute", bottom: 2, right: 2, zIndex: 2 }} />}
        {/* Match-percentage pill (grid view only — the list-view avatar is too
            small at 78px to carry a legible badge; see the inline one added
            near the name/type below instead). Same fallback and threshold as
            DiscoverScreen's card pill and PublicProfileScreen's hero pill:
            .matchScore for live-scored candidates, .score for the static
            demo deck, hidden below 15% and behind showMatchPercent. */}
        {!isList && (() => {
          const ms = Number((m as any).matchScore ?? (m as any).score ?? 0);
          const showMatchPercent = (m as any).showMatchPercent !== false;
          return ms >= 15 && showMatchPercent ? (
            <div
              className="card-match-topleft"
              style={{ background: "rgba(255,215,0,0.16)", border: "1px solid rgba(255,215,0,0.4)", color: "var(--gold)", fontWeight: 800, zIndex: 2 }}
              aria-label={`${ms}% match`}
            >{ms}%</div>
          ) : null;
        })()}
      </div>
      <div className="match-info" style={isList ? { marginLeft: 14, textAlign: "left" } : undefined}>
        <div className="match-name" style={{ display: "flex", alignItems: "center", gap: 5, ...(isList ? { fontSize: 15, lineHeight: 1.2 } : {}) }}>
          {m.name}
          {m.verified && <span className="card-verified-mark" style={{ fontSize: 13, cursor: "pointer" }} title="Identity verified" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: "Verified", desc: "Identity verified by Muse — we confirmed this member's government ID and professional credentials.", icon: "✓", color: "#FFD700" }); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setBadgeInfo({ name: "Verified", desc: "Identity verified by Muse — we confirmed this member's government ID and professional credentials.", icon: "✓", color: "#FFD700" }); } }}>✓</span>}
          {/* Role badge */}
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: isMuse ? "rgba(255,215,0,0.12)" : "rgba(138,43,226,0.12)", border: `1px solid ${isMuse ? "rgba(255,215,0,0.25)" : "rgba(138,43,226,0.25)"}`, color: isMuse ? "var(--gold)" : "#b388ff", whiteSpace: "nowrap" }}>
            {roleBadgeText(matchRole)}
          </span>
          {m._demo && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.25)", color: "#ff6b6b", whiteSpace: "nowrap" }}>Demo</span>}
        </div>
        <div className="match-type" style={isList ? { fontSize: 11 } : undefined}>
          {m.type}
          {/* List-view match-percentage badge — the 78px avatar is too small
              for the overlay pill grid view uses, so it's shown inline here
              instead. Same fallback/threshold/visibility rules. */}
          {isList && (() => {
            const ms = Number((m as any).matchScore ?? (m as any).score ?? 0);
            const showMatchPercent = (m as any).showMatchPercent !== false;
            return ms >= 15 && showMatchPercent ? (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "var(--gold)" }} aria-label={`${ms}% match`}>{ms}% match</span>
            ) : null;
          })()}
        </div>
        {isList && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
            {m.location && <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.location}</span>}
            {typeof m.distanceMi === "number" && <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.distanceMi} mi</span>}
          </div>
        )}
        {isList && (
          // Audit fix (2026-09-08, same batch item 4): "Bubble badges
          // inconsistent on some matches (list view) only" — the trait
          // badges (zodiac/MBTI/life-path/skills, using .match-badge) and
          // the "looking for X" tags right below them were two different
          // pill families (different font-size, padding, colors) stacked in
          // the same card, so a match with both types on screen read as
          // inconsistent bubble styling. Merged "looking for" into the same
          // .match-badges row using the shared .match-badge base (just a
          // pink accent via inline style, same shape/size as every other
          // badge), and capped the combined count to 4 so cards with a lot
          // of traits don't sprawl to multiple wrapped rows or overhang.
          (() => {
            const items: React.ReactNode[] = [];
            if (m.zodiac) items.push(<button key="z" className="match-badge" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: `${m.zodiac} — ${ZODIAC_FULL[m.zodiac]?.tag || ""}`, desc: ZODIAC_FULL[m.zodiac]?.desc || "", icon: ZODIAC_GLYPH[m.zodiac] || "✦", color: "#D4A5FF" }); }} style={{ cursor: "pointer" }}>{ZODIAC_GLYPH[m.zodiac] || "✦"} {m.zodiac}</button>);
            if (m.mbti) items.push(<button key="m" className="match-badge" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: `${m.mbti} — ${MBTI_FULL[m.mbti]?.tag || ""}`, desc: MBTI_FULL[m.mbti]?.desc || "", icon: <MbtiIcon code={m.mbti} size={20} />, color: "#FFD700" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}><MbtiIcon code={m.mbti} size={11} /> {m.mbti}</button>);
            if (m.lifePath) items.push(<button key="lp" className="match-badge" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: `Life Path ${m.lifePath}`, desc: LIFE_PATH_FULL[String(m.lifePath)] || "", icon: <LifePathIcon n={Number(m.lifePath)} size={20} />, color: "#98FB98" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}><LifePathIcon n={Number(m.lifePath)} size={11} /> LP {m.lifePath}</button>);
            (m.skills || []).forEach((s: string) => items.push(<span key={"s-" + s} className="match-badge">{s}</span>));
            (m.looking || []).forEach((l: string) => items.push(<span key={"l-" + l} className="match-badge" style={{ background: "rgba(255,105,180,0.12)", color: "#FF69B4", border: "1px solid rgba(255,105,180,0.2)" }}>looking for {l}</span>));
            // A list card is a scan surface, not a profile summary. Three
            // chips keep the metadata to one calm row on mobile; the count
            // preserves the fact that more context is available after opening
            // the match instead of forcing a noisy second wrapped row.
            const shown = items.slice(0, 3);
            const remaining = items.length - shown.length;
            return shown.length > 0 ? <div className="match-badges match-badges-list">{shown}{remaining > 0 && <span className="match-badge match-badge-more">+{remaining}</span>}</div> : null;
          })()
        )}
        {!isList && (
          <div className="match-badges">
            {m.zodiac && <button className="match-badge" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: `${m.zodiac} — ${ZODIAC_FULL[m.zodiac]?.tag || ""}`, desc: ZODIAC_FULL[m.zodiac]?.desc || "", icon: ZODIAC_GLYPH[m.zodiac] || "✦", color: "#D4A5FF" }); }} style={{ cursor: "pointer" }}>{ZODIAC_GLYPH[m.zodiac] || "✦"} {m.zodiac}</button>}
            {m.mbti && <button className="match-badge" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: `${m.mbti} — ${MBTI_FULL[m.mbti]?.tag || ""}`, desc: MBTI_FULL[m.mbti]?.desc || "", icon: <MbtiIcon code={m.mbti} size={20} />, color: "#FFD700" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}><MbtiIcon code={m.mbti} size={11} /> {m.mbti}</button>}
            {m.lifePath && <button className="match-badge" onClick={(e) => { e.stopPropagation(); setBadgeInfo({ name: `Life Path ${m.lifePath}`, desc: LIFE_PATH_FULL[String(m.lifePath)] || "", icon: <LifePathIcon n={Number(m.lifePath)} size={20} />, color: "#98FB98" }); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}><LifePathIcon n={Number(m.lifePath)} size={11} /> LP {m.lifePath}</button>}
            {(m.skills || []).slice(0, 2).map((s: string) => <span key={s} className="match-badge">{s}</span>)}
          </div>
        )}
        {isList && (() => {
          const last = m.messages?.[m.messages.length - 1];
          if (!last?.text) return null;
          return (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>💬 {last.text}</div>
          );
        })()}
      </div>
      <div className="match-time">{m.messages?.[m.messages.length - 1]?.time || "New"}</div>
      <BadgeInfoModal info={badgeInfo} onClose={() => setBadgeInfo(null)} />
    </div>
  );
});

export default MatchCard;
