"use client";

import React, { memo } from "react";
import { FiMessageCircle } from "react-icons/fi";

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
    setReportTarget,
    setShowReport,
    setUnmatchTarget,
    setBlockTarget,
    handleImgError,
    getIcebreaker,
  } = actions;

  const mid = String(m.id);

  return (
    <div
      data-mid={mid}
      className="match-card match-card-grid"
      onClick={() => {
        setChatTarget(m);
        showScreen("chat");
      }}
    >
      <div className="match-avatar-wrap">
        <img loading="lazy" src={m.img} alt={m.name} className="match-avatar" onError={handleImgError} />
        {m.online && <div className="online-dot" style={{ position: "absolute", bottom: 10, right: 10 }} />}
      </div>
      <div className="match-info">
        <div className="match-name">{m.name}</div>
        <div className="match-type">{m.type}</div>
        <div className="match-loc-dist">
          {m.location && <span>📍 {m.location}</span>}
          {typeof m.distanceMi === "number" && <span>{m.distanceMi} mi</span>}
        </div>
        <div className="match-badges">
          {m.zodiac && <span className="match-badge">{m.zodiac}</span>}
          {m.mbti && <span className="match-badge">{m.mbti}</span>}
          {m.lifePath && <span className="match-badge">LP {m.lifePath}</span>}
          {(m.skills || []).slice(0, 2).map((s: string) => <span key={s} className="match-badge">{s}</span>)}
        </div>
      </div>
      <div className="match-time">{m.messages?.[m.messages.length - 1]?.time || "New"}</div>
    </div>
  );
});

export default MatchCard;