"use client";

import React, { memo, useEffect, useState } from "react";
import type { TutorialDef, TutorialStep } from "./tutorials";

interface Rect { left: number; top: number; width: number; height: number; anchor?: string; }

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
      if (r.width < 4 || r.height < 4) { setRect(null); return; }
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 650);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", measure); };
  }, [step.selector]);

  return rect;
}

export const TutorialOverlay = memo(function TutorialOverlay({
  tutorial,
  onDone,
  onStepSelector,
}: {
  tutorial: TutorialDef;
  onDone: () => void;
  onStepSelector?: (selector: string | undefined) => void;
}) {
  const [idx, setIdx] = useState(0);
  const steps: TutorialStep[] = tutorial.steps;
  const step = steps[idx];
  const rect = useElementRect(step);

  useEffect(() => { onStepSelector?.(step.selector); }, [step.selector, onStepSelector]);
  useEffect(() => () => onStepSelector?.(undefined), [onStepSelector]);

  const next = () => {
    if (idx >= steps.length - 1) onDone();
    else setIdx(idx + 1);
  };

  const ring: Rect | null = rect;
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

  const vw = window.innerWidth, vh = window.innerHeight;
  const TOOLTIP_WIDTH = 280;
  const MARGIN = 12;
  const RESERVED_HEIGHT = 260;

  const targetCenterX = target.left + target.width / 2;
  const spaceAbove = target.top;
  const spaceBelow = vh - (target.top + target.height);
  const vertical = spaceAbove > spaceBelow ? "top" : "bottom";
  const horizontal = targetCenterX < vw * 0.5 ? "left" : "right";

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    width: TOOLTIP_WIDTH,
    maxHeight: `calc(100vh - ${MARGIN * 2}px)`,
    overflowY: "auto",
    background: "linear-gradient(135deg,#1a0a2e,#2d1b4e)",
    border: "1px solid rgba(255,215,0,0.25)",
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    transition: "all .3s ease",
  };

  const rawLeft = horizontal === "left" ? target.left : target.left + target.width - TOOLTIP_WIDTH;
  tooltipStyle.left = Math.min(Math.max(rawLeft, MARGIN), Math.max(MARGIN, vw - TOOLTIP_WIDTH - MARGIN));

  if (vertical === "bottom") {
    tooltipStyle.top = Math.min(target.top + target.height + 16, Math.max(MARGIN, vh - RESERVED_HEIGHT));
  } else {
    tooltipStyle.bottom = Math.min(vh - target.top + 16, Math.max(MARGIN, vh - RESERVED_HEIGHT));
  }

  const highlightRadius = target.anchor === "fab" ? "50%" : Math.min(22, target.width / 3);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "auto" }}>
      <div role="presentation" aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)" }} onClick={next} />

      <div style={{
        position: "absolute", left: target.left, top: target.top, width: target.width, height: target.height,
        borderRadius: highlightRadius,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
        border: "2px solid var(--gold, #FFD700)",
        pointerEvents: "none",
        transition: "all .3s ease",
      }} />

      <div style={tooltipStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{step.title}</div>
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
