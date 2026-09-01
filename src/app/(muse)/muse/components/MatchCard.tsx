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

const MatchCard = memo(function MatchCard({ m, view, actions }: MatchCardProps) {
  const {
    setChatTarget,
    showScreen,
    handleImgError,
  } = actions;

  const mid = String(m.id);
  const isList = view === "list";

  return (
    <div
      data-mid={mid}
      className={isList ? "match-card" : "match-card match-card-grid"}
      onClick={() => {
        setChatTarget(m);
        showScreen("chat");
      }}
    >
      <div className="match-avatar-wrap" style={isList ? { position: "relative", width: 64, height: 64, flexShrink: 0 } : undefined}>
        {isList && <div className="profile-ring" style={{ width: 76, height: 76 }} />}
        <img
          loading="lazy"
          src={m.img}
          alt={m.name}
          className="match-avatar"
          style={isList ? { width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: "2.5px solid transparent", background: "#1a0a2e", position: "relative", zIndex: 1 } : undefined}
          onError={handleImgError}
        />
        {m.online && <div className="online-dot" style={{ position: "absolute", bottom: 2, right: 2, zIndex: 2 }} />}
      </div>
      <div className="match-info">
        <div className="match-name" style={isList ? { fontSize: 15 } : undefined}>{m.name}</div>
        <div className="match-type" style={isList ? { fontSize: 11 } : undefined}>{m.type}</div>
        {isList && (
          <div className="match-loc-dist" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {m.location && <span>📍 {m.location}</span>}
            {typeof m.distanceMi === "number" && <span> · {m.distanceMi} mi</span>}
          </div>
        )}
        <div className="match-badges">
          {m.zodiac && <span className="match-badge">{m.zodiac}</span>}
          {m.mbti && <span className="match-badge">{m.mbti}</span>}
          {m.lifePath && <span className="match-badge">LP {m.lifePath}</span>}
          {(m.skills || []).slice(0, isList ? 3 : 2).map((s: string) => <span key={s} className="match-badge">{s}</span>)}
        </div>
      </div>
      <div className="match-time">{m.messages?.[m.messages.length - 1]?.time || "New"}</div>
    </div>
  );
});

export default MatchCard;
