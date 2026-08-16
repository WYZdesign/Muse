"use client";

import React, { memo, useState, useRef, useCallback } from "react";
import { FiHeart, FiFlag, FiUserX, FiSlash, FiMessageCircle } from "react-icons/fi";

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
    setUnmatchTarget: (v: string) => void;
    setBlockTarget: (v: string) => void;
    handleImgError: (e: any) => void;
    getIcebreaker: (type: string, seed?: string) => string;
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
  } = actions;

  const mid = String(m.id);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);

  const SWIPE_THRESHOLD = 75;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (view === "grid" || expanded) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isHorizontalRef.current = null;
    setIsDragging(true);
  }, [view, expanded]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || view === "grid" || expanded) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Detect gesture direction
    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (isHorizontalRef.current) {
      // Apply rubber-banding beyond threshold
      const sign = dx < 0 ? -1 : 1;
      const absDx = Math.abs(dx);
      const damped = absDx > 120 ? 120 + (absDx - 120) * 0.3 : absDx;
      setDragOffset(sign * damped);
    }
  }, [isDragging, view, expanded]);

  const handlePointerEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (isHorizontalRef.current) {
      if (dragOffset < -SWIPE_THRESHOLD) {
        // Swipe Left -> Unmatch
        setUnmatchTarget(m.name);
      } else if (dragOffset > SWIPE_THRESHOLD) {
        // Swipe Right -> Report
        setReportTarget({ id: m.id, type: "match", name: m.name });
        setShowReport(true);
      }
    }

    setDragOffset(0);
    isHorizontalRef.current = null;
  }, [isDragging, dragOffset, m.id, m.name, setUnmatchTarget, setReportTarget, setShowReport]);

  const leftActive = dragOffset < -20;
  const rightActive = dragOffset > 20;
  const leftPct = leftActive ? Math.min(100, (Math.abs(dragOffset) / SWIPE_THRESHOLD) * 100) : 0;
  const rightPct = rightActive ? Math.min(100, (dragOffset / SWIPE_THRESHOLD) * 100) : 0;

  if (view === "grid") {
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
        transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
        transition: isDragging ? "none" : "transform .32s cubic-bezier(.22,1.2,.36,1), background .25s ease",
        position: "relative",
        overflow: "hidden",
        touchAction: "pan-y",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={() => {
        if (Math.abs(dragOffset) > 10) return;
        if (expanded) {
          setExpandedMatchId(null);
          return;
        }
        setExpandedMatchId(mid);
      }}
    >
      {/* Swipe background reveal left (Unmatch) */}
      {leftPct > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, rgba(239,68,68,0.3) 0%, rgba(239,68,68,0.08) 100%)",
            borderLeft: "3px solid #ef4444",
            zIndex: 0,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
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

      {/* Swipe background reveal right (Report) */}
      {rightPct > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(270deg, rgba(255,191,0,0.3) 0%, rgba(255,191,0,0.08) 100%)",
            borderRight: "3px solid var(--gold)",
            zIndex: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 16,
            gap: 6,
            color: "var(--gold)",
            fontWeight: 700,
            fontSize: 12,
            opacity: Math.min(1, rightPct / 80),
          }}
        >
          <span>Report</span>
          <FiFlag size={16} />
        </div>
      )}

      {/* Main card contents */}
      <div className="match-avatar-wrap" style={{ zIndex: 1 }}>
        <img loading="lazy" src={m.img} alt={m.name} className="match-avatar" onError={handleImgError} />
        {m.online && <div className="online-dot" />}
      </div>

      <div className="match-info" style={{ zIndex: 1, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div className="match-name">{m.name}</div>
          <div className="match-time">{m.messages?.[m.messages.length - 1]?.time || "Active"}</div>
        </div>
        <div className="match-type">{m.type}</div>
        <div className="match-msg">
          {m.messages?.[m.messages.length - 1]?.text || getIcebreaker(m.type, mid)}
        </div>

        {expanded && (
          <div className="match-expand" onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
            <div className="match-expand-bio">{m.bio || "Creative soul looking for their next collaboration."}</div>
            <div className="match-expand-meta">
              {m.location && <span>📍 {m.location}</span>}
              {typeof m.distanceMi === "number" && <span>• {m.distanceMi} mi</span>}
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
                  setUnmatchTarget(m.name);
                }}
              >
                <FiUserX size={13} style={{ marginRight: 4 }} /> Unmatch
              </button>
              <button
                className="match-expand-btn"
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text2)" }}
                onClick={() => {
                  setExpandedMatchId(null);
                  setBlockTarget(m.name);
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
  );
});

export default MatchCard;
