"use client";

import { memo, useCallback } from "react";
import { FiHeart } from "react-icons/fi";

// ═══ Memoized MatchCard — prevents all cards re-rendering on every state change ═══
const MatchCard = memo(function MatchCard({ m, expanded, swiping, view, actions }: {
  m: any;
  expanded: boolean;
  swiping: { id: string; offset: number } | null;
  view: "list" | "grid";
  actions: {
    setExpandedMatchId: (v: string | null) => void;
    setChatTarget: (v: any) => void;
    showScreen: (s: any) => void;
    setMatchSwiping: (v: { id: string; offset: number } | null) => void;
    setReportTarget: (v: any) => void;
    setShowReport: (v: boolean) => void;
    setUnmatchTarget: (v: string) => void;
    handleImgError: (e: any) => void;
    getIcebreaker: (type: string, seed?: string) => string;
  };
}) {
  const { setExpandedMatchId, setChatTarget, showScreen, setMatchSwiping, setReportTarget, setShowReport, setUnmatchTarget, handleImgError, getIcebreaker } = actions;
  const mid = String(m.id);
  const swipingMe = swiping?.id === mid;
  const swipeOffset = swipingMe ? swiping!.offset : 0;
  const leftPct = swipeOffset < -20 ? Math.min(100, (Math.abs(swipeOffset) / 80) * 100) : 0;
  const rightPct = swipeOffset > 20 ? Math.min(100, (swipeOffset / 80) * 100) : 0;

  const finishSwipe = useCallback((offset: number) => {
    setMatchSwiping(null);
    if (Math.abs(offset) > 80) {
      if (offset > 0) { setReportTarget({ id: m.id, type: "match", name: m.name }); setShowReport(true); }
      else { setUnmatchTarget(m.name); }
    }
  }, [m.id, m.name, setMatchSwiping, setReportTarget, setShowReport, setUnmatchTarget]);

  return (
    <div data-mid={mid} data-exp={expanded ? "1" : "0"} className={"match-card" + (expanded ? " match-card-expanded" : "") + (view === "grid" ? " match-card-grid" : "")}
      style={{ transform: swipingMe ? `translateX(${swiping!.offset}px)` : undefined, transition: swiping ? "none" : "transform .25s ease", position: "relative", overflow: "hidden" }}
      onClick={() => { if (expanded) { setExpandedMatchId(null); return; } setChatTarget(m); showScreen("chat"); }}
      onMouseDown={(e) => { const startX = e.clientX; const startY = e.clientY; const handleMove = (ev: MouseEvent) => { const dx = ev.clientX - startX; const dy = ev.clientY - startY; if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy)) { ev.preventDefault(); setMatchSwiping({ id: mid, offset: dx }); return false; } }; const handleUp = (ev: MouseEvent) => { const dx = ev.clientX - startX; finishSwipe(dx); document.removeEventListener("mousemove", handleMove); document.removeEventListener("mouseup", handleUp); }; document.addEventListener("mousemove", handleMove, { passive: false }); document.addEventListener("mouseup", handleUp); }}
      onTouchStart={(e) => { const startX = e.touches[0].clientX; const startY = e.touches[0].clientY; const handleMove = (ev: TouchEvent) => { const dx = ev.touches[0].clientX - startX; const dy = ev.touches[0].clientY - startY; if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy)) { setMatchSwiping({ id: mid, offset: dx }); } }; const handleEnd = (ev: TouchEvent) => { const dx = ev.touches[0].clientX - startX; finishSwipe(dx); document.removeEventListener("touchmove", handleMove); document.removeEventListener("touchend", handleEnd); }; document.addEventListener("touchmove", handleMove, { passive: false }); document.addEventListener("touchend", handleEnd); }}
    >
      {leftPct > 0 && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${leftPct}%`, background: "linear-gradient(90deg,#ff4444,#FFD700)", opacity: 0.3, transition: swiping ? "none" : "all .3s", zIndex: 0, borderRadius: "inherit" }} />
      )}
      {rightPct > 0 && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${rightPct}%`, background: "linear-gradient(270deg,#FFD700,#ff8c00)", opacity: 0.3, transition: swiping ? "none" : "all .3s", zIndex: 0, borderRadius: "inherit" }} />
      )}
      <div className="match-avatar-wrap">
        <img loading="lazy" src={m.img} alt={m.name} className="match-avatar" onError={handleImgError} />
        {m.online && <div className="online-dot" />}
      </div>
      <div className="match-info">
        <div className="match-name">{m.name}</div>
        <div className="match-type">{m.type}</div>
        <div className="match-msg">{m.messages?.[m.messages.length - 1]?.text || getIcebreaker(m.type, mid)}</div>
        {expanded && (
          <div className="match-expand">
            <div className="match-expand-bio">{m.bio || "Creative soul looking for their next collaboration."}</div>
            <div className="match-expand-meta">
              {m.location && <span>{m.location}</span>}
              {typeof m.distanceMi === "number" && <span>{m.distanceMi} mi</span>}
              {m.zodiac && <span>{m.zodiac}</span>}
            </div>
            <button className="match-expand-btn" onClick={(e) => { e.stopPropagation(); setExpandedMatchId(null); setChatTarget(m); showScreen("chat"); }}>Open Chat</button>
          </div>
        )}
      </div>
      <div className="match-time">{m.messages?.[m.messages.length - 1]?.time || ""}</div>
      <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--coral)", opacity: swipingMe && swiping!.offset < 0 ? 0.8 : 0.3, transition: "opacity .2s", pointerEvents: "none" }}><FiHeart size={14} /> Report</div>
      <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--coral)", opacity: swipingMe && swiping!.offset > 0 ? 0.8 : 0.3, transition: "opacity .2s", pointerEvents: "none" }}>Unmatch <FiHeart size={14} /></div>
    </div>
  );
});

export default MatchCard;
