"use client";

import React, { memo, useState, useRef, useCallback } from "react";
import { FiFlag, FiUserX, FiSlash, FiMessageCircle } from "react-icons/fi";

export interface MatchCardProps {
  m: any;
  expanded: boolean;
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

const MatchCard = memo(function MatchCard({ m, expanded, view, actions }: MatchCardProps) {
  const {
    setExpandedMatchId,
    setChatTarget,
    showScreen,
    setReportTarget,
    setShowReport,
    setUnmatchTarget,
    setBlockTarget,
    handleImgError,
    getIcebreaker,
    setViewProfile,
  } = actions;

  const openProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setViewProfile?.(m);
  }, [m, setViewProfile]);

  const mid = String(m.id);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const [revealed, setRevealed] = useState<"report" | "block" | null>(null);

  const SWIPE_THRESHOLD = 75;
  const REVEAL_OFFSET = 180;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (expanded) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isHorizontalRef.current = null;
    setIsDragging(true);
  }, [expanded]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || expanded) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (isHorizontalRef.current) {
      const sign = dx < 0 ? -1 : 1;
      const absDx = Math.abs(dx);
      const damped = absDx > 120 ? 120 + (absDx - 120) * 0.3 : absDx;
      setDragOffset(sign * damped);
    }
  }, [isDragging, expanded]);

  const handlePointerEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (isHorizontalRef.current) {
      if (dragOffset < -SWIPE_THRESHOLD) {
        setUnmatchTarget({ id: mid, name: m.name });
      } else if (dragOffset > SWIPE_THRESHOLD) {
        setRevealed("report");
      }
    }

    setDragOffset(0);
    isHorizontalRef.current = null;
  }, [isDragging, dragOffset, m.id, m.name, mid, setUnmatchTarget]);

  const closeReveal = useCallback(() => setRevealed(null), []);

  const fireReport = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealed(null);
    setReportTarget({ id: m.id, type: "match", name: m.name });
    setShowReport(true);
  }, [m.id, m.name, setReportTarget, setShowReport]);

  const fireBlock = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealed(null);
    setBlockTarget({ id: String(m.id), name: m.name });
  }, [m.id, m.name, setBlockTarget]);

  const revealX = revealed ? REVEAL_OFFSET : 0;

  const leftActive = dragOffset < -20;
  const leftPct = leftActive ? Math.min(100, (Math.abs(dragOffset) / SWIPE_THRESHOLD) * 100) : 0;

  if (view === "grid") {
    return (
      <div
        data-mid={mid}
        className="match-card match-card-grid"
        onClick={() => {
          if (expanded) {
            setChatTarget(m);
            showScreen("chat");
          } else {
            setExpandedMatchId(mid);
          }
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
            {(m.skills || []).slice(0, expanded ? 99 : 2).map((s: string) => <span key={s} className="match-badge">{s}</span>)}
          </div>
          {expanded && (
            <div className="match-grid-expand">
              {m.bio && <div className="match-grid-bio">{m.bio}</div>}
              <div className="match-grid-tags">
                {(m.styles || []).slice(0, 5).map((s: string) => <span key={s} className="match-badge">{s}</span>)}
              </div>
              <button
                className="btn btn-gold"
                style={{ width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, borderRadius: 12, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setChatTarget(m);
                  showScreen("chat");
                }}
              >
                💬 Open Chat
              </button>
            </div>
          )}
        </div>
        <div className="match-time">{m.messages?.[m.messages.length - 1]?.time || "New"}</div>
      </div>
    );
  }

  return (
    <div
      data-mid={mid}
      data-exp={expanded ? "1" : "0"}
      className={"match-card" + (expanded ? " match-card-expanded" : "")}
      style={{
        position: "relative",
        overflow: "hidden",
        touchAction: "pan-y",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={() => {
        if (revealed) return;
        if (Math.abs(dragOffset) > 10) return;
        setChatTarget(m);
        showScreen("chat");
      }}
    >
      {/* Swipe background reveal left (Unmatch) */}
      {leftPct > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, rgba(239,68,68,0.3) 0%, rgba(239,68,68,0.08) 100%)",
            borderRight: "3px solid #ef4444",
            zIndex: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 16,
            gap: 6,
            color: "#ff5c5c",
            fontWeight: 700,
            fontSize: 12,
            opacity: Math.min(1, leftPct / 80),
          }}
        >
          <FiUserX size={16} />
          <span>Unmatch</span>
        </div>
      )}

      {/* Persistent Report/Block reveal panel (right swipe) */}
      {revealed === "report" && !isDragging && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: REVEAL_OFFSET,
            zIndex: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingLeft: 12,
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={fireReport}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 12,
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.2)",
              color: "var(--gold)",
              fontWeight: 700,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <FiFlag size={13} /> Report
          </button>
          <button
            type="button"
            onClick={fireBlock}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--text2)",
              fontWeight: 700,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <FiSlash size={13} /> Block
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); closeReveal(); }}
            style={{
              width: "100%",
              padding: "6px 0",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontWeight: 600,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main card contents */}
      <div
        style={{
          transform: isDragging ? `translateX(${dragOffset}px)` : `translateX(${revealX}px)`,
          transition: isDragging ? "none" : "transform .32s cubic-bezier(.22,1.2,.36,1), background .25s ease",
          position: "relative",
          zIndex: 1,
          background: "inherit",
          display: "flex",
          alignItems: expanded ? "flex-start" : "center",
          flexWrap: expanded ? "wrap" : "nowrap",
          gap: 16,
          width: "100%",
        }}
      >
        <div className="match-avatar-wrap" style={{ zIndex: 1 }}>
          <img loading="lazy" src={m.img} alt={m.name} className="match-avatar" onError={handleImgError} onClick={openProfile} style={{ cursor: "pointer" }} />
          <div className={`profile-ring swirl-ring-${(m.id % 6) + 1}`} />
          {m.online && <div className="online-dot" />}
        </div>

        <div className="match-info" style={{ zIndex: 1, flex: 1, minWidth: 0 }}>
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

          {expanded && (
            <div className="match-expand" onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, position: "relative" }}>
              <button onClick={(e) => { e.stopPropagation(); setExpandedMatchId(null); }} aria-label="Close" style={{ position: "absolute", top: -4, right: -4, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>{"\u2715"}</button>
              <div className="match-expand-bio">{m.bio || "Creative soul looking for their next collaboration."}</div>
              <div className="match-expand-meta">
                {m.location && <span>📍 {m.location}</span>}
                 {typeof m.distanceMi === "number" && <span>{m.distanceMi} mi</span>}
                {m.zodiac && <span>• {m.zodiac}</span>}
              </div>

              <button
                className="btn btn-gold"
                style={{ width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, borderRadius: 12, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={() => {
                  setExpandedMatchId(null);
                  setChatTarget(m);
                  showScreen("chat");
                }}
              >
                <FiMessageCircle size={16} /> Open Chat
              </button>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="match-expand-btn"
                  style={{ flex: 1, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ff5c5c" }}
                  onClick={() => {
                    setExpandedMatchId(null);
                    setUnmatchTarget({ id: mid, name: m.name });
                  }}
                >
                  <FiUserX size={13} style={{ marginRight: 4 }} /> Unmatch
                </button>
                <button
                  className="match-expand-btn"
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text2)" }}
                  onClick={() => {
                    setExpandedMatchId(null);
                    setBlockTarget({ id: String(m.id), name: m.name });
                  }}
                >
                  <FiSlash size={13} style={{ marginRight: 4 }} /> Block
                </button>
                <button
                  className="match-expand-btn"
                  style={{ flex: 1, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)" }}
                  onClick={() => {
                    setExpandedMatchId(null);
                    setReportTarget({ id: m.id, type: "match", name: m.name });
                    setShowReport(true);
                  }}
                >
                  <FiFlag size={13} style={{ marginRight: 4 }} /> Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MatchCard;
