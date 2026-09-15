"use client";

import React from "react";
import { FiArrowLeft } from "react-icons/fi";
import type { Screen } from "../components/types";

interface MatchGuideScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  goBack?: () => void;
}

// Plain-language mirror of the point values calcMatch() (components/types.ts)
// actually adds — every row here traces to a real branch in that function, in
// the same order it checks them, so this never drifts into invented copy.
const FACTORS: { label: string; points: number; max: number; blurb: string }[] = [
  { label: "Base score", points: 40, max: 40, blurb: "Every match starts here." },
  { label: "Shared styles/aesthetics", points: 21, max: 21, blurb: "Up to 21 pts for the styles you both list." },
  { label: "What you're looking for", points: 15, max: 15, blurb: "They match what you said you want to collab on." },
  { label: "Complementary roles", points: 10, max: 10, blurb: "e.g. a photographer + a model — roles that naturally pair." },
  { label: "Role you're looking for", points: 8, max: 8, blurb: "Their role is literally what you said you're after." },
  { label: "Zodiac compatibility", points: 6, max: 6, blurb: "Same or classically compatible sign." },
  { label: "Chinese zodiac match", points: 6, max: 6, blurb: "Same animal year." },
  { label: "MBTI compatibility", points: 5, max: 5, blurb: "Same or a classically complementary type." },
  { label: "Life path number match", points: 5, max: 5, blurb: "Numerology life-path match." },
  { label: "Verified identity", points: 3, max: 3, blurb: "They've completed Muse's ID verification." },
  { label: "Active collaborator", points: 2, max: 2, blurb: "They've completed 50+ collabs on Muse." },
];

export function MatchGuideScreen({ screen, showScreen, goBack }: MatchGuideScreenProps) {
  return (
    <div className="phone-wrap">
      <div className="phone" id="muse-app">
        <div className={"screen-el" + (screen === "matchGuide" ? " active" : "")} style={{ display: "flex", flexDirection: "column", height: "100vh" }} data-screen="matchGuide">
          <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: "calc(12px + env(safe-area-inset-top,0px)) 18px 12px" }}>
            <button className="chat-back" onClick={() => (goBack ? goBack() : showScreen("discover"))}><FiArrowLeft size={20} /></button>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Playfair Display',serif", fontStyle: "italic", color: "var(--gold)" }}>How Matching Works</div>
            <div style={{ width: 42 }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 60px" }}>
            <p style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.6, marginBottom: 20 }}>
              Every match % starts at a 40-point base, then adds points for the real things you and the other person have in common — shared styles, complementary creative roles, and what you're each looking for carry the most weight. Personality extras (zodiac, MBTI, life path) add a little more. The total is capped at 99%.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {FACTORS.map((f) => (
                <div key={f.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{f.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)" }}>+{f.points}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ height: "100%", width: `${(f.max / 40) * 100}%`, borderRadius: 3, background: "linear-gradient(90deg,var(--gold),var(--coral))" }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>{f.blurb}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: "14px 16px", borderRadius: 14, background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.14)" }}>
              <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5 }}>
                Tap the info icon on any match % (on Discover, or in a profile) to see exactly which of these factors applied to that specific match.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchGuideScreen;
