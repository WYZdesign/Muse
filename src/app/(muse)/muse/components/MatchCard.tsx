"use client";

import React, { memo } from "react";

export interface MatchCardProps {
  m: any;
  view: "list" | "grid";
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
  };
}

const AVATAR_SIZE = 78;
const RING_SIZE = 90; // wyzmind's live-verified sizing (Session 81/82 — 83 was too tight)
const RING_SPEEDS = [3.2, 4.5, 5.8, 3.8, 5.1, 4.2, 6.0, 3.5, 4.8, 5.5];
const RING_VARIANTS = ["ring-v1", "ring-v2", "ring-v3", "ring-v4", "ring-v5"];

const MatchCard = memo(function MatchCard({ m, view, actions }: MatchCardProps) {
  const {
    setChatTarget,
    showScreen,
    handleImgError,
  } = actions;

  const mid = String(m.id);
  const isList = view === "list";
  const ringSpeed = RING_SPEEDS[parseInt(mid, 10) % RING_SPEEDS.length] || 4;
  const ringVariant = RING_VARIANTS[parseInt(mid, 10) % RING_VARIANTS.length] || RING_VARIANTS[0];

  return (
    <div
      data-mid={mid}
      className={isList ? "match-card" : "match-card match-card-grid"}
      onClick={() => {
        setChatTarget(m);
        showScreen("chat");
      }}
    >
      <div className="match-avatar-wrap" style={isList ? { position: "relative", width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0 } : undefined}>
        {isList && <div className={`profile-ring ${ringVariant}`} style={{ width: RING_SIZE, height: RING_SIZE, animationDuration: `${ringSpeed}s` }} />}
        <img
          loading="lazy"
          src={m.img}
          alt={m.name}
          className="match-avatar"
          style={isList ? { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: "50%", objectFit: "cover", border: "2.5px solid transparent", background: "#1a0a2e", position: "relative", zIndex: 1 } : undefined}
          onError={handleImgError}
        />
        {m.online && <div className="online-dot" style={{ position: "absolute", bottom: 2, right: 2, zIndex: 2 }} />}
      </div>
      <div className="match-info">
        <div className="match-name" style={isList ? { fontSize: 15, lineHeight: 1.2 } : undefined}>{m.name}</div>
        <div className="match-type" style={isList ? { fontSize: 11 } : undefined}>{m.type}</div>
        {isList && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
            {m.location && <span style={{ fontSize: 11, color: "var(--muted)" }}>📍 {m.location}</span>}
            {typeof m.distanceMi === "number" && <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.distanceMi} mi</span>}
          </div>
        )}
        {isList && (
          <div className="match-badges" style={{ marginTop: 4 }}>
            {m.zodiac && <span className="match-badge">{m.zodiac}</span>}
            {m.mbti && <span className="match-badge">{m.mbti}</span>}
            {m.lifePath && <span className="match-badge">LP {m.lifePath}</span>}
            {(m.skills || []).slice(0, 3).map((s: string) => <span key={s} className="match-badge">{s}</span>)}
          </div>
        )}
        {isList && m.looking && m.looking.length > 0 && (
          <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {m.looking.slice(0, 2).map((l: string) => (
              <span key={l} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, background: "rgba(255,105,180,0.12)", color: "#FF69B4", border: "1px solid rgba(255,105,180,0.2)" }}>looking for {l}</span>
            ))}
          </div>
        )}
        {!isList && (
          <div className="match-badges">
            {m.zodiac && <span className="match-badge">{m.zodiac}</span>}
            {m.mbti && <span className="match-badge">{m.mbti}</span>}
            {m.lifePath && <span className="match-badge">LP {m.lifePath}</span>}
            {(m.skills || []).slice(0, 2).map((s: string) => <span key={s} className="match-badge">{s}</span>)}
          </div>
        )}
      </div>
      <div className="match-time">{m.messages?.[m.messages.length - 1]?.time || "New"}</div>
    </div>
  );
});

export default MatchCard;
