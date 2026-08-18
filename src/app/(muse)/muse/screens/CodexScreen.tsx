"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft, FiBookOpen } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";
import { ZODIAC, ZE, CHINESE, CE, MBTI, LIFE_PATHS, CREATIVE_TYPES, LOOKING_FOR, AESTHETICS } from "../components/types";

export interface CodexScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  openHamburger: () => void;
  unreadNotificationCount: number;
}

// ── BADGE MASTER GLOSSARY ────────────────────────────────────────────────────
interface BadgeDef { name: string; icon: string; color: string; short: string; long: string; tier: "trust" | "achievement" | "engagement" | "community"; }
const BADGES: BadgeDef[] = [
  { name: "Verified Pro", icon: "✓", color: "#FFD700", tier: "trust", short: "Identity verified by Muse", long: "This member's government ID and/or professional credentials were verified by the Muse team. A Verified Pro is a confirmed real person with a legitimate creative identity — the strongest trust signal on the platform." },
  { name: "Top Creator", icon: "★", color: "#FF8A80", tier: "achievement", short: "80+ collaborations completed", long: "Awarded after completing 80 or more collaborations on Muse. Top Creators are seasoned professionals with a proven, high-volume track record of shipped work." },
  { name: "Creative Sage", icon: "◊", color: "#FFB5C2", tier: "achievement", short: "47+ collaborations completed", long: "Awarded after 47+ completed collaborations. Creative Sages are trusted veterans with deep experience — the middle milestone between Rising Star and Top Creator." },
  { name: "Super Collab", icon: "♥", color: "#FF69B4", tier: "engagement", short: "High match compatibility", long: "Indicates this profile scores exceptionally high against your own compatibility criteria — shared styles, complementary roles, aligned personality, or mutual interests. A Super Collab is a strong prompt to reach out." },
  { name: "Match Magnet", icon: "♥", color: "#FF69B4", tier: "engagement", short: "10+ matches this month", long: "Received 10 or more matches in the current month. Match Magnets are in high demand right now — expect a busy inbox and quick responses." },
  { name: "Quick Responder", icon: "⚡", color: "#FFD700", tier: "engagement", short: "Responds within 2 hours", long: "This member replies to messages within 2 hours on average. A Quick Responder badge means fast, reliable communication — ideal if you're on a tight timeline." },
  { name: "Style Icon", icon: "✦", color: "#D4A5FF", tier: "community", short: "Recognized for outstanding style", long: "Their portfolio has been spotlighted by the Muse community for exceptional aesthetic, composition, or distinctive voice. A Style Icon is someone worth studying." },
  { name: "Local Legend", icon: "📍", color: "#87CEEB", tier: "community", short: "Top creative in their city", long: "Ranked among the most-active and highest-rated creatives in their city. Local Legends are the go-to collaborators in their market." },
  { name: "Rising Star", icon: "✦", color: "#98FB98", tier: "achievement", short: "New to Muse, gaining traction", long: "New to Muse and already gaining momentum — either 100+ matches received, or rapid early traction. Rising Stars are fresh energy; get in early before they blow up." },
  { name: "Full Moon", icon: "🌕", color: "#C0C0FF", tier: "achievement", short: "1 year on Muse", long: "Earned after one full year on the platform. A Full Moon member has been a consistent part of the Muse community." },
  { name: "Golden Hour", icon: "☀️", color: "#FFD700", tier: "achievement", short: "50+ shoots completed", long: "Completed 50+ shoots through Muse bookings. Golden Hour creators have delivered at volume and are battle-tested on set." },
  { name: "Collab King", icon: "👑", color: "#FFD700", tier: "achievement", short: "10+ bookings completed", long: "Completed 10+ bookings through Muse. A Collab King has proven they can convert a match into real, paid, finished work." },
  { name: "Social Butterfly", icon: "🦋", color: "#FF69B4", tier: "engagement", short: "500+ messages", long: "Sent 500+ messages on Muse. Social Butterflies are deeply active conversationalists and networkers." },
];

// ── MBTI MASTER GLOSSARY ─────────────────────────────────────────────────────
const MBTI_MAP: Record<string, { tag: string; desc: string; best: string }> = {
  "INTJ": { tag: "The Architect", desc: "Strategic, independent, and future-focused. INTJs plan years ahead and execute ruthlessly toward a singular vision.", best: "ENTP, ENFP" },
  "INTP": { tag: "The Logician", desc: "Inventive, analytical, endlessly curious. INTPs deconstruct ideas to their bones and rebuild them better.", best: "ENTJ, ENFJ" },
  "ENTJ": { tag: "The Commander", desc: "Bold, decisive, natural leaders. ENTJs rally teams and drive projects to completion on schedule.", best: "INTP, INFP" },
  "ENTP": { tag: "The Debater", desc: "Quick-witted idea generators who thrive on challenge. ENTPs spark innovation through argument and exploration.", best: "INTJ, INFJ" },
  "INFJ": { tag: "The Advocate", desc: "Quiet visionaries guided by strong principles. INFJs craft meaning and pursue causes with quiet intensity.", best: "ENFP, ENTP" },
  "INFP": { tag: "The Mediator", desc: "Idealistic and deeply creative. INFPs translate emotion and imagination into authentic work.", best: "ENFJ, ENTJ" },
  "ENFJ": { tag: "The Protagonist", desc: "Charismatic, empathetic leaders who bring out the best in people. ENFJs make collaborators feel seen and valued.", best: "INFP, INTP" },
  "ENFP": { tag: "The Campaigner", desc: "Enthusiastic, spontaneous, and endlessly sociable. ENFPs ignite energy and possibility wherever they go.", best: "INFJ, INTJ" },
  "ISTJ": { tag: "The Logistician", desc: "Dependable, detail-oriented, and organized. ISTJs deliver flawless execution and honor every commitment.", best: "ESFP, ESTP" },
  "ISFJ": { tag: "The Defender", desc: "Warm, meticulous, and protective. ISFJs are the reliable backbone of any creative crew.", best: "ESFP, ESTP" },
  "ESTJ": { tag: "The Executive", desc: "Efficient organizers who turn plans into reality. ESTJs run tight, productive productions.", best: "ISFP, ISTP" },
  "ESFJ": { tag: "The Consul", desc: "Harmonious, people-first, and conscientious. ESFJs keep teams connected and morale high.", best: "ISFP, ISTP" },
  "ISTP": { tag: "The Virtuoso", desc: "Hands-on, cool under pressure, master toolers. ISTPs solve problems on the fly with calm precision.", best: "ESFJ, ESTJ" },
  "ISFP": { tag: "The Adventurer", desc: "Artistic, spontaneous, and sensory. ISFPs create beauty in the moment and live by aesthetics.", best: "ESFJ, ESTJ" },
  "ESTP": { tag: "The Entrepreneur", desc: "Bold, energetic, and pragmatic. ESTPs thrive on set, making split-second decisions with flair.", best: "ISTJ, ISFJ" },
  "ESFP": { tag: "The Entertainer", desc: "Lively, expressive, and magnetic. ESFPs bring the show — and the crowd — to every project.", best: "ISTJ, ISFJ" },
};

// ── LIFE PATH MASTER GLOSSARY ────────────────────────────────────────────────
const LIFE_PATH_MAP: Record<string, string> = {
  "1": "The Leader — independent, ambitious, a born initiator. Path 1 creatives pioneer new directions and hate being told what to do.",
  "2": "The Diplomat — sensitive, cooperative, the glue of any collaboration. Path 2 excels at harmony and intuitive partnership.",
  "3": "The Creative — expressive, joyful, natural communicators. Path 3 is the artist, writer, and performer archetype.",
  "4": "The Builder — disciplined, reliable, master of structure. Path 4 turns vision into durable, tangible work.",
  "5": "The Freedom Seeker — versatile, restless, drawn to adventure. Path 5 thrives on variety and bold experimentation.",
  "6": "The Nurturer — responsible, loving, the caregiver of the group. Path 6 makes collaborators feel supported and safe.",
  "7": "The Seeker — analytical, introspective, drawn to mystery. Path 7 digs deep for meaning and truth.",
  "8": "The Powerhouse — driven, commanding, built for achievement. Path 8 channels ambition into real-world success.",
  "9": "The Humanitarian — compassionate, wise, globally minded. Path 9 creates work that serves a larger purpose.",
  "11": "The Illuminator — a Master Number. Intensely intuitive and inspired; the conduit for visionary ideas.",
  "22": "The Master Builder — a Master Number. Dreams on a world-changing scale, with the discipline to actually build them.",
  "33": "The Master Teacher — a Master Number. The rare healer-mentor; elevates everyone around them.",
};

// ── CONNECTION TYPE GLOSSARY ─────────────────────────────────────────────────
const CONN_TYPES = [
  { name: "Collaborator", icon: "🤝", color: "#FFD700", desc: "You want to make work together — a project, a shoot, a commission." },
  { name: "Friend", icon: "👥", color: "#87CEEB", desc: "You're looking for creative community and genuine friendship, not just work." },
  { name: "Mentor", icon: "🎓", color: "#98FB98", desc: "You want guidance, teaching, or someone to learn from (or to be that for others)." },
  { name: "Partner", icon: "💞", color: "#FF69B4", desc: "You're open to a deeper romantic or creative-life partnership." },
];

// ── CREATIVE TYPE GLOSSARY ───────────────────────────────────────────────────
const TYPE_ICONS: Record<string, string> = {
  "Photographer": "📷", "Model": "🧍", "Content Creator": "🎥", "Director": "🎬", "Editor": "✂️",
  "MUA": "💄", "Stylist": "👗", "Actor": "🎭", "Videographer": "📹", "Writer": "✍️", "Producer": "📋", "Designer": "🎨", "Musician": "🎵",
};

const TYPE_DESC: Record<string, string> = {
  "Photographer": "Captures still imagery — editorial, portrait, fashion, fine art, commercial.",
  "Model": "The on-camera subject — runway, editorial, figure, and lifestyle.",
  "Content Creator": "Produces social and digital content across platforms for brands and audiences.",
  "Director": "Leads creative vision on set — film, music video, commercial, and experimental.",
  "Editor": "Post-production craft — cutting, pacing, color, VFX, and finishing.",
  "MUA": "Makeup Artist — transforms faces and bodies into art.",
  "Stylist": "Curates wardrobe, props, and look — the aesthetic architect.",
  "Actor": "Performs character work across film, stage, and commercial.",
  "Videographer": "Captures moving image — drone, gimbal, documentary, and event.",
  "Writer": "Crafts narrative — scripts, copy, essays, and editorial prose.",
  "Producer": "Makes it happen — funding, crew, schedule, and logistics.",
  "Designer": "Shapes visual systems — branding, UI/UX, layout, and identity.",
};

export const CodexScreen = memo(function CodexScreen({
  screen,
  showScreen,
  openHamburger,
  unreadNotificationCount,
}: CodexScreenProps) {
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const [tab, setTab] = useState<"badges" | "personality" | "roles" | "matching">("badges");

  return (
    <div className={"screen-el" + (screen === "codex" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}>
        <button className="chat-back" onClick={() => showScreen("profile")}><FiArrowLeft size={20} /></button>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 22, fontWeight: 800, color: "var(--gold)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}><FiBookOpen size={18} /> The Codex</div>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ display: "flex", gap: 6, margin: "0 16px 12px", padding: 4, background: "rgba(255,255,255,0.04)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
        {([["badges", "🏅 Badges"], ["personality", "🔮 Personality"], ["roles", "🎭 Roles"], ["matching", "💞 Matching"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "12px 0", borderRadius: 13, border: "none", background: tab === key ? "linear-gradient(135deg,rgba(255,69,0,0.25),rgba(255,215,0,0.15))" : "transparent", color: tab === key ? "var(--gold)" : "var(--text2)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 96px" }}>

        {tab === "badges" && (
          <>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.5 }}>Badges are signals of trust, achievement, engagement, and community standing. Tap any badge for its full meaning.</p>
            {(["trust", "achievement", "engagement", "community"] as const).map(tier => (
              <div key={tier} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 10 }}>
                  {tier === "trust" ? "🔒 Trust" : tier === "achievement" ? "🏆 Achievement" : tier === "engagement" ? "⚡ Engagement" : "🌍 Community"}
                </div>
                {BADGES.filter(b => b.tier === tier).map(b => (
                  <button key={b.name} onClick={() => setOpenBadge(openBadge === b.name ? null : b.name)} style={{ width: "100%", textAlign: "left", marginBottom: 8, padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,0.025)", border: `1px solid ${openBadge === b.name ? b.color : "rgba(255,255,255,0.06)"}`, cursor: "pointer", transition: "all .25s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: `${b.color}20`, border: `1px solid ${b.color}40`, color: b.color, flexShrink: 0 }}>{b.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text2)" }}>{b.short}</div>
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 16, transition: "transform .25s", transform: openBadge === b.name ? "rotate(90deg)" : "none" }}>›</div>
                    </div>
                    {openBadge === b.name && <div style={{ marginTop: 12, fontSize: 13, color: "var(--text2)", lineHeight: 1.6, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>{b.long}</div>}
                  </button>
                ))}
              </div>
            ))}
          </>
        )}

        {tab === "personality" && (
          <>
            <Section title="🌞 Western Zodiac" subtitle="Your sun sign — the core of your creative identity.">
              {ZODIAC.map(z => <Chip key={z} icon="" name={z} desc={ZE[z] || ""} color="#FFD700" />)}
            </Section>
            <Section title="🐉 Chinese Zodiac" subtitle="Your year animal — temperament and instinct.">
              {CHINESE.map(c => <Chip key={c} icon="" name={c} desc={CE[c] || ""} color="#FF8A80" />)}
            </Section>
            <Section title="🧠 MBTI" subtitle="16 personality types — how you think, create, and collaborate.">
              {MBTI.map(m => <Chip key={m} icon="" name={`${m} — ${MBTI_MAP[m]?.tag || ""}`} desc={`${MBTI_MAP[m]?.desc || ""} Best collabs: ${MBTI_MAP[m]?.best || ""}.`} color="#D4A5FF" />)}
            </Section>
            <Section title="🔢 Life Path Numbers" subtitle="Derived from your birthdate — your life's blueprint.">
              {LIFE_PATHS.map(n => <Chip key={n} icon="" name={`Life Path ${n}`} desc={LIFE_PATH_MAP[String(n)] || ""} color="#98FB98" />)}
            </Section>
          </>
        )}

        {tab === "roles" && (
          <>
            <Section title="🎭 Creative Types" subtitle="The role you play on set and in collaboration.">
              {CREATIVE_TYPES.map(t => <Chip key={t} icon={TYPE_ICONS[t] || "🎨"} name={t} desc={TYPE_DESC[t] || "A creative professional."} color="#FFD700" />)}
            </Section>
            <Section title="🖌️ Aesthetics / Styles" subtitle="Visual and creative styles you work in.">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {AESTHETICS.map(a => <span key={a} style={{ padding: "8px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text)" }}>{a}</span>)}
              </div>
            </Section>
          </>
        )}

        {tab === "matching" && (
          <>
            <Section title="💞 Connection Types" subtitle="What you're looking for in a match.">
              {CONN_TYPES.map(c => <Chip key={c.name} icon={c.icon} name={c.name} desc={c.desc} color={c.color} />)}
            </Section>
            <Section title="🔎 Looking For" subtitle="Roles you want to connect with.">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {LOOKING_FOR.map(l => <span key={l} style={{ padding: "8px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)" }}>{l}</span>)}
              </div>
            </Section>
            <Section title="⚖️ How Match % Works" subtitle="The compatibility score on every profile.">
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16, fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
                <div>• Starts at 40% baseline.</div>
                <div>• <b>Shared styles</b> — up to +21%.</div>
                <div>• <b>Complementary looking-for</b> — +15%.</div>
                <div>• <b>Role match</b> — +8%.</div>
                <div>• <b>Zodiac compatibility</b> — up to +6%.</div>
                <div>• <b>Chinese zodiac match</b> — +6%.</div>
                <div>• <b>MBTI compatibility</b> — up to +5%.</div>
                <div>• <b>Life path match</b> — +5%.</div>
                <div>• <b>Verified</b> — +3%; <b>50+ collabs</b> — +2%.</div>
                <div style={{ marginTop: 8, color: "var(--muted)" }}>Capped at 99%. A score of 70%+ is a strong signal to reach out.</div>
              </div>
            </Section>
          </>
        )}
      </div>
      <Nav active="profile" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
    </div>
  );
});

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

function Chip({ icon, name, desc, color }: { icon: string; name: string; desc: string; color: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", marginBottom: 8, borderRadius: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {icon ? <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: `${color}20`, border: `1px solid ${color}40`, flexShrink: 0 }}>{icon}</div> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

export default CodexScreen;
