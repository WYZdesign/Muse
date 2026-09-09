"use client";

// ── Shared badge/trait description maps + tap-to-detail popover ────────────
// Originally defined only inside DiscoverScreen.tsx (where badges were
// already tappable), this was the "existing badgeInfo pattern" referenced
// by the Torreé batch handover's item 1 ("all badges tappable everywhere,
// reuse the existing badgeInfo/whyInfo pattern"). Extracted here so every
// screen that renders a zodiac/MBTI/Chinese-zodiac/life-path/style badge —
// not just Discover's swipe cards — can wire the same tap → detail-popover
// behavior instead of rendering a dead, non-interactive pill.
import React from "react";

export const ZODIAC_FULL: Record<string, { icon: string; tag: string; desc: string }> = {
  Aries: { icon: "♈", tag: "The Pioneer", desc: "Bold, ambitious, and first to try something new. Great at kicking off projects and rallying collaborators." },
  Taurus: { icon: "♉", tag: "The Builder", desc: "Reliable, patient, and deeply creative. Prefers quality over quantity and sees work through to a polished finish." },
  Gemini: { icon: "♊", tag: "The Communicator", desc: "Versatile, expressive, and quick-witted. Loves variety and keeps the conversation flowing on set." },
  Cancer: { icon: "♋", tag: "The Nurturer", desc: "Intuitive, emotional, and protective. Creates safe spaces where collaborators do their best work." },
  Leo: { icon: "♌", tag: "The Performer", desc: "Creative, passionate, and generous. A natural performer who brings energy and warmth to every project." },
  Virgo: { icon: "♍", tag: "The Analyst", desc: "Analytical, practical, and detail-oriented. Brings precision and polish to every frame." },
  Libra: { icon: "♎", tag: "The Diplomat", desc: "Balanced, social, and artistic. Sees beauty in everything and keeps the team in harmony." },
  Scorpio: { icon: "♏", tag: "The Strategist", desc: "Resourceful, brave, and passionate. Deep focus and intensity, fully committed to the work." },
  Sagittarius: { icon: "♐", tag: "The Explorer", desc: "Generous, idealistic, and adventurous. Always exploring new horizons and pushing creative limits." },
  Capricorn: { icon: "♑", tag: "The Achiever", desc: "Responsible, disciplined, and ambitious. Builds lasting work and delivers on time, every time." },
  Aquarius: { icon: "♒", tag: "The Visionary", desc: "Progressive, original, and independent. Thinks outside the box and invents new creative forms." },
  Pisces: { icon: "♓", tag: "The Dreamer", desc: "Compassionate, artistic, and intuitive. Feels deeply and creates freely, the soul of any project." },
};

export const MBTI_FULL: Record<string, { tag: string; desc: string }> = {
  INTJ: { tag: "The Architect", desc: "Strategic, independent, and future-focused. Plans ahead and sees it through toward one clear vision." },
  INTP: { tag: "The Logician", desc: "Inventive, analytical, and endlessly curious. Takes ideas apart and rebuilds them better." },
  ENTJ: { tag: "The Commander", desc: "Bold, decisive, a natural leader. Rallies teams and drives projects to the finish on time." },
  ENTP: { tag: "The Debater", desc: "Quick-witted idea generator who loves a challenge. Sparks fresh thinking through questions and exploration." },
  INFJ: { tag: "The Advocate", desc: "Quiet visionary with strong principles. Finds deep meaning and chases causes with steady focus." },
  INFP: { tag: "The Mediator", desc: "Idealistic and deeply creative. Turns emotion and imagination into authentic work." },
  ENFJ: { tag: "The Protagonist", desc: "Charismatic, big-hearted leader. Brings out the best in people and makes everyone feel valued." },
  ENFP: { tag: "The Campaigner", desc: "Enthusiastic, spontaneous, and endlessly social. Brings energy and possibility everywhere." },
  ISTJ: { tag: "The Logistician", desc: "Dependable, detail-oriented, and organized. Delivers clean execution and keeps every commitment." },
  ISFJ: { tag: "The Defender", desc: "Warm, careful, and protective. The steady backbone of any creative crew." },
  ESTJ: { tag: "The Executive", desc: "Efficient organizer who turns plans into reality. Runs tight, productive productions." },
  ESFJ: { tag: "The Consul", desc: "Harmonious, people-first, and conscientious. Keeps the team connected and the mood high." },
  ISTP: { tag: "The Virtuoso", desc: "Hands-on and cool under pressure. Solves problems on the fly with calm precision." },
  ISFP: { tag: "The Adventurer", desc: "Artistic, spontaneous, and in the moment. Creates beauty and lives by what looks and feels right." },
  ESTP: { tag: "The Entrepreneur", desc: "Bold, energetic, and pragmatic. Thrives on set and makes fast decisions with style." },
  ESFP: { tag: "The Entertainer", desc: "Lively, expressive, and magnetic. Brings the show, and the crowd, to every project." },
};

export const CHINESE_FULL: Record<string, string> = {
  Rat: "Quick-witted, resourceful, and adaptable. Spots opportunity everywhere and moves fast.",
  Ox: "Steadfast, reliable, and methodical. The dependable worker who never quits.",
  Tiger: "Courageous, competitive, and magnetic. Brings fearless energy to every project.",
  Rabbit: "Graceful, diplomatic, and gentle. Prefers harmony and quiet excellence over noise.",
  Dragon: "Charismatic, ambitious, and confident. A natural showstopper who leads with flair.",
  Snake: "Wise, intuitive, and thoughtful. Moves with calm, calculated precision.",
  Horse: "Energetic, independent, and spirited. Chases freedom and creative adventure.",
  Goat: "Creative, gentle, and aesthetic. Nurtures beauty and calm in every project.",
  Monkey: "Clever, playful, and inventive. Finds smart solutions and keeps things fun.",
  Rooster: "Confident, observant, and exacting. Proud of the craft and detail-oriented.",
  Dog: "Loyal, honest, and protective. A true collaborator you can always count on.",
  Pig: "Generous, warm, and sincere. Brings heart and authenticity to every project.",
};

export const LIFE_PATH_FULL: Record<string, string> = {
  "1": "The Leader, independent, ambitious, a born starter. Pioneers new directions.",
  "2": "The Diplomat, sensitive and cooperative, the glue of any collaboration.",
  "3": "The Creative, expressive and joyful, a natural communicator and artist.",
  "4": "The Builder, disciplined and reliable, a master of structure and solid work.",
  "5": "The Freedom Seeker, versatile and restless, drawn to adventure and trying new things.",
  "6": "The Nurturer, responsible and loving, makes collaborators feel supported and safe.",
  "7": "The Seeker, analytical and reflective, digs deep for meaning and truth.",
  "8": "The Powerhouse, driven and commanding, turns ambition into real success.",
  "9": "The Humanitarian, compassionate and wise, makes work that serves a bigger purpose.",
  "11": "The Illuminator, a Master Number. Deeply intuitive and inspired, a channel for big ideas.",
  "22": "The Master Builder, a Master Number. Dreams on a huge scale, with the focus to actually build it.",
  "33": "The Master Teacher, a Master Number. The rare healer who lifts up everyone around them.",
};

export const STYLE_FULL: Record<string, string> = {
  Portrait: "Focused on the person, their face, form, and expression.",
  Editorial: "Magazine-style storytelling images with a narrative thread.",
  Commercial: "Brand and advertising work built to sell a product or idea.",
  "Music Video": "Moving images synced to music, performance, and rhythm.",
  Documentary: "Real, unscripted storytelling, the truth caught on camera.",
  Branding: "Visual identity, logos, and cohesive brand systems.",
  "Body Art": "Fine-art figure and body-paint photography of the human form.",
  "Fine Art": "Gallery-minded imagery that puts concept and emotion first.",
  Fashion: "Work centered on clothing, style, and the runway.",
  Experimental: "Unconventional, boundary-pushing approaches to image and film.",
  Dark: "Moody, dramatic, low-key visuals with strong contrast.",
  Dreamy: "Soft, ethereal, romantic visuals with hazy light.",
  Bold: "High-impact, saturated, unapologetically striking images.",
  Vintage: "Retro, film-inspired visuals with a warm, nostalgic feel.",
  Abstract: "Art focused on form, color, and texture rather than a subject.",
  Film: "Moving-picture work like narrative, short, and feature film.",
};

export const CONN_FULL: Record<string, string> = {
  collab: "Wants to make work together, like a project, a shoot, or a commission.",
  partner: "Open to a deeper, long-term creative-life partnership.",
  friend: "Looking for creative community and real friendship, not just work.",
  mentor: "Seeking guidance, teaching, or someone to learn from, or to be that for someone else.",
};

export interface BadgeInfo {
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}

/** Shared tap-to-detail popover. Render once per screen alongside a
 *  `const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null)`,
 *  and pass `onClick={() => setBadgeInfo({...})}` on each badge/pill. */
export function BadgeInfoModal({ info, onClose }: { info: BadgeInfo | null; onClose: () => void }) {
  if (!info) return null;
  return (
    <div role="presentation" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "#1a0a2e", border: `1px solid ${info.color}40`, borderRadius: 20, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: `${info.color}20`, border: `1px solid ${info.color}40`, color: info.color, flexShrink: 0 }}>{info.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{info.name}</div>
        </div>
        <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>{info.desc}</div>
        <button onClick={onClose} style={{ marginTop: 18, width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,rgba(255,69,0,0.25),rgba(255,215,0,0.15))", color: "var(--gold)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Got it</button>
      </div>
    </div>
  );
}
