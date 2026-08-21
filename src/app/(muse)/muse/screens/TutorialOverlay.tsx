"use client";

import React, { memo, useEffect, useState } from "react";
import type { TutorialDef, TutorialStep } from "./tutorials";

interface Rect { left: number; top: number; width: number; height: number; }

// Real-element highlight: measure the target DOM node via querySelector so the
// gold ring outlines the ACTUAL element on each screen (not a hardcoded guess
// shaped to Discover's layout). Falls back to a generic centered band when the
// selector isn't present.
function useElementRect(step: TutorialStep): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const selector = step.selector;
    if (!selector) { setRect(null); return; }
    let el: Element | null = null;
    try { el = document.querySelector(selector); } catch { el = null; }
    if (!el) { setRect(null); return; }

    const measure = () => {
      const r = el!.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    // Re-measure on resize and shortly after mount (layout settle).
    const t = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [step.selector]);

  return rect;
}

export const TutorialOverlay = memo(function TutorialOverlay({
  tutorial,
  onDone,
}: {
  tutorial: TutorialDef;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const steps: TutorialStep[] = tutorial.steps;
  const step = steps[idx];
  const rect = useElementRect(step);

  const next = () => {
    if (idx >= steps.length - 1) onDone();
    else setIdx(idx + 1);
  };

  // A real measured element → ring it exactly.
  const ring: Rect | null = rect;
  // Generic fallback positions for screens where no selector matches.
  const generic = (anchor: string): Rect => {
    const vw = window.innerWidth, vh = window.innerHeight;
    switch (anchor) {
      case "card": return { left: vw * 0.08, top: vh * 0.16, width: vw * 0.84, height: vh * 0.52 };
      case "fab": return { left: vw - 106, top: vh - 184, width: 76, height: 76 };
      case "nav": return { left: 0, top: vh - 88, width: vw, height: 88 };
      case "header": return { left: 0, top: 0, width: vw, height: 96 };
      case "center":
      default: return { left: vw * 0.15, top: vh * 0.38, width: vw * 0.7, height: vh * 0.2 };
    }
  };
  const target = ring || generic(step.anchor);
  const isFab = step.anchor === "fab";

  // ── Tooltip placement: put the explainer on the OPPOSITE side of the
  // highlighted element so it never covers what it's describing. ──
  const vw = window.innerWidth, vh = window.innerHeight;
  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;
  const horizontal = targetCenterX < vw * 0.5 ? "left" : "right";
  const vertical = targetCenterY < vh * 0.5 ? "bottom" : "top";

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    width: 280,
    background: "linear-gradient(135deg,#1a0a2e,#2d1b4e)",
    border: "1px solid rgba(255,215,0,0.25)",
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    transition: "all .3s ease",
  };
  if (vertical === "bottom") {
    tooltipStyle.left = horizontal === "left" ? Math.max(12, target.left) : undefined;
    tooltipStyle.right = horizontal === "right" ? Math.max(12, vw - target.left - target.width) : undefined;
    tooltipStyle.top = target.top + target.height + 16;
  } else {
    tooltipStyle.left = horizontal === "left" ? Math.max(12, target.left) : undefined;
    tooltipStyle.right = horizontal === "right" ? Math.max(12, vw - target.left - target.width) : undefined;
    tooltipStyle.bottom = vh - target.top + 16;
  }

  const highlightRadius = isFab ? "50%" : Math.min(22, target.width / 3);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "auto" }}>
      {/* dim backdrop — tap to advance */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)" }} onClick={next} />

      {/* spotlight cutout: the target stays bright, everything else dark */}
      <div style={{
        position: "absolute", left: target.left, top: target.top, width: target.width, height: target.height,
        borderRadius: highlightRadius,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        border: "2.5px solid var(--gold, #FFD700)",
        pointerEvents: "none",
        transition: "all .3s ease",
      }} />

      {/* tooltip card — opposite side of the highlight */}
      <div style={tooltipStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#FFD700,#FF8A80,#D4A5FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✨</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{step.title}</div>
        </div>
        <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, marginBottom: 16 }}>{step.body}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {steps.map((s, i) => <div key={s.id} style={{ width: 8, height: 8, borderRadius: 4, background: i === idx ? "var(--gold)" : "rgba(255,255,255,0.2)", transition: "all .25s" }} />)}
          </div>
          <button onClick={next} style={{ padding: "12px 26px", borderRadius: 14, border: "none", background: "linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)", backgroundSize: "300% 300%", color: "#0a0612", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            {idx >= steps.length - 1 ? "Let's go!" : "Next"}
          </button>
        </div>
        <button onClick={onDone} aria-label="Close" style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
});

export default TutorialOverlay;
