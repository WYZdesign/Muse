"use client";

import React, { memo, useState, useEffect } from "react";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  // positioning: which area to highlight
  anchor: "card" | "fab" | "nav" | "header" | "center";
}

const STEPS: TutorialStep[] = [
  { id: "card", title: "Discover Cards", anchor: "card", body: "Here's your deck of creatives. Tap the left or right side of the photo to browse their images, and scroll down to read their full profile, prompts, styles, and portfolio." },
  { id: "fab", title: "Match Actions", anchor: "fab", body: "This is the magic button. Tap it to open your quick actions: Rewind, Pass, Super Like, Like, and Like + Note." },
  { id: "swipe", title: "Swipe to Decide", anchor: "center", body: "You can also swipe right to like and left to pass, or tap the round buttons. Every like gets you closer to a match." },
  { id: "nav", title: "Navigation", anchor: "nav", body: "Use the bottom bar to move between Discover, Feed, Collab, Muses, and BTS. The menu button opens everything else, like your profile and settings." },
];

export const DiscoverTutorial = memo(function DiscoverTutorial({
  onDone,
}: {
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];

  const next = () => {
    if (idx >= STEPS.length - 1) onDone();
    else setIdx(idx + 1);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "auto" }}>
      {/* dim backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)" }} onClick={next} />

      {/* highlight ring depending on anchor */}
      {step.anchor === "card" && <div style={{ position: "absolute", top: "16%", left: "50%", transform: "translateX(-50%)", width: "84%", height: "52%", border: "2.5px solid var(--gold, #FFD700)", borderRadius: 22, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", pointerEvents: "none" }} />}
      {step.anchor === "fab" && <div style={{ position: "absolute", bottom: 108, right: 30, width: 76, height: 76, border: "2.5px solid var(--gold, #FFD700)", borderRadius: "50%", boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", pointerEvents: "none" }} />}
      {step.anchor === "nav" && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 88, border: "2.5px solid var(--gold, #FFD700)", borderRadius: 20, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", pointerEvents: "none" }} />}

      {/* tooltip card */}
      <div style={{ position: "absolute", left: 20, right: 20, bottom: 120, background: "linear-gradient(135deg,#1a0a2e,#2d1b4e)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 20, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#FFD700,#FF8A80,#D4A5FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✨</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{step.title}</div>
        </div>
        <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, marginBottom: 16 }}>{step.body}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((s, i) => <div key={s.id} style={{ width: 8, height: 8, borderRadius: 4, background: i === idx ? "var(--gold)" : "rgba(255,255,255,0.2)", transition: "all .25s" }} />)}
          </div>
          <button onClick={next} style={{ padding: "12px 26px", borderRadius: 14, border: "none", background: "linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)", backgroundSize: "300% 300%", color: "#0a0612", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            {idx >= STEPS.length - 1 ? "Let's go!" : "Next"}
          </button>
        </div>
        <button onClick={onDone} aria-label="Close" style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
});

export default DiscoverTutorial;
