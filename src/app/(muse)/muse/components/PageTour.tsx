"use client";

import React, { useEffect, useRef, useState } from "react";
import { FiX, FiArrowRight, FiArrowLeft } from "react-icons/fi";

export interface PageTourSlide {
  eyebrow: string;
  title: string;
  body: string;
  highlight: string;
  steps: string[];
}

export interface PageTourProps {
  open: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  from: string;
  to: string;
  slides: PageTourSlide[];
  /** How many orbit dots circle the badge — lets each screen's tutorial feel
   *  a little different in motion, not just in color. */
  orbitCount?: 1 | 2 | 3;
  /** How many spark particles burst outward on mount. */
  sparkCount?: number;
  ringStyle?: "solid" | "dashed";
  ariaLabel?: string;
}

function randSpark() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 60 + Math.random() * 70;
  return {
    "--vx": `${Math.cos(angle) * dist}px`,
    "--vy": `${Math.sin(angle) * dist}px`,
    animationDelay: `${Math.random() * 0.15}s`,
  } as React.CSSProperties;
}

function PageTourSprite({
  icon, from, to, orbitCount, sparkCount, ringStyle,
}: { icon: React.ReactNode; from: string; to: string; orbitCount: number; sparkCount: number; ringStyle: "solid" | "dashed" }) {
  const [sparks] = useState(() => Array.from({ length: sparkCount }, randSpark));
  return (
    <div className="tour-sprite-wrap">
      <div className="tour-sprite-glow" style={{ background: `radial-gradient(circle, ${from}66, transparent 72%)` }} />
      <div className="tour-sprite-ring" style={{ borderColor: from, borderStyle: ringStyle }} />
      <div className="tour-sprite-ring tour-sprite-ring-2" style={{ borderColor: to, borderStyle: ringStyle }} />
      <div className="tour-sprite-badge" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <span className="tour-sprite-icon">{icon}</span>
      </div>
      {Array.from({ length: orbitCount }, (_, i) => (
        <div key={i} className={`tour-sprite-orbit tour-sprite-orbit-${i}`}>
          <div className="tour-sprite-orbit-dot" style={{ background: i % 2 ? to : from }} />
        </div>
      ))}
      <div className="tour-sprite-burst">
        {sparks.map((s, i) => (
          <div key={i} className="tour-sprite-spark" style={{ ...s, background: i % 2 ? from : to }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Small, single-page-scoped tutorial lightbox. Built on the same visual
 * system as the old combined FeatureTour (sprite animation, gradient
 * theming via --tour-a/--tour-b, card chrome, swipe navigation, dot pager)
 * but shows only one screen's own 1-3 slides at a time. page.tsx owns which
 * screen's tour (if any) is currently open and fires this the first time a
 * user visits that screen.
 */
export default function PageTour({
  open, onClose, icon, from, to, slides,
  orbitCount = 3, sparkCount = 10, ringStyle = "solid", ariaLabel = "Page tutorial",
}: PageTourProps) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { if (open) setIdx(0); }, [open]);

  if (!open || slides.length === 0) return null;

  const slide = slides[idx];
  const isLast = idx >= slides.length - 1;
  const isFirst = idx === 0;

  const next = () => { if (isLast) onClose(); else setIdx(i => i + 1); };
  const back = () => { if (!isFirst) setIdx(i => i - 1); };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) next();
    else if (dx > 40) back();
    touchStartX.current = null;
  };

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel} onClick={onClose}>
      <div
        className="tour-card"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ ["--tour-a" as any]: from, ["--tour-b" as any]: to }}
      >
        <div className="tour-card-wash" />
        <button className="tour-close" onClick={onClose} aria-label="Close tutorial"><FiX size={18} /></button>

        <div className="tour-page" key={idx}>
          <PageTourSprite icon={icon} from={from} to={to} orbitCount={orbitCount} sparkCount={sparkCount} ringStyle={ringStyle} />
          <div className="tour-eyebrow">{slide.eyebrow}</div>
          <div className="tour-title">{slide.title}</div>
          <div className="tour-body">{slide.body}</div>
          <div className="tour-highlight">{slide.highlight}</div>
          <div className="tour-steps">
            {slide.steps.map((s, i) => (
              <div key={i} className="tour-step">
                <span className="tour-step-num">{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="tour-footer">
          {slides.length > 1 && (
            <div className="tour-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={"tour-dot" + (i === idx ? " active" : "")}
                  aria-label={"Go to slide " + (i + 1)}
                  onClick={() => setIdx(i)}
                />
              ))}
            </div>
          )}
          <div className="tour-nav-row">
            {slides.length > 1 && !isFirst ? (
              <button className="tour-btn tour-btn-ghost" onClick={back}><FiArrowLeft size={15} /> Back</button>
            ) : slides.length > 1 ? (
              <button className="tour-btn tour-btn-ghost" onClick={onClose}>Skip</button>
            ) : null}
            <button className="tour-btn tour-btn-primary" style={slides.length === 1 ? { width: "100%" } : undefined} onClick={next}>
              {isLast ? "Got it" : "Next"} {!isLast && <FiArrowRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
