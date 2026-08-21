"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft, FiBookOpen } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";
import { CODEX_ZODIAC, CODEX_CHINESE, CODEX_LIFE_PATH, CODEX_MBTI, CODEX_TYPES, CODEX_AESTHETICS } from "../components/codexData";

export interface CodexScreenProps {
  screen: Screen;
  showScreen: (s: Screen) => void;
  openHamburger: () => void;
  unreadNotificationCount: number;
}

// ── BADGE MASTER GLOSSARY ────────────────────────────────────────────────────
interface BadgeDef { name: string; icon: string; color: string; short: string; long: string; tier: "trust" | "achievement" | "engagement" | "community"; }
const BADGES: BadgeDef[] = [
  { name: "Verified Pro", icon: "✓", color: "#FFD700", tier: "trust", short: "Identity verified by Muse", long: "We checked this member's government ID and professional credentials. A Verified Pro is a confirmed real person with a real creative identity, and it's the strongest trust signal on the platform." },
  { name: "Top Creator", icon: "★", color: "#FF8A80", tier: "achievement", short: "80+ collaborations completed", long: "Earned after completing 80 or more collaborations on Muse. Top Creators are seasoned pros with a long, proven record of shipped work." },
  { name: "Creative Sage", icon: "◊", color: "#FFB5C2", tier: "achievement", short: "47+ collaborations completed", long: "Earned after 47+ completed collaborations. Creative Sages are trusted veterans with deep experience, the step between Rising Star and Top Creator." },
  { name: "Super Collab", icon: "♥", color: "#FF69B4", tier: "engagement", short: "High match compatibility", long: "This profile scores really well against your own compatibility, whether it's shared styles, complementary roles, aligned personality, or shared interests. A Super Collab is a strong nudge to say hi." },
  { name: "Match Magnet", icon: "♥", color: "#FF69B4", tier: "engagement", short: "10+ matches this month", long: "Got 10 or more matches this month. Match Magnets are in demand right now, so expect a busy inbox and quick replies." },
  { name: "Quick Responder", icon: "⚡", color: "#FFD700", tier: "engagement", short: "Responds within 2 hours", long: "This member replies within 2 hours on average. A Quick Responder badge means fast, reliable communication, perfect when you're on a deadline." },
  { name: "Style Icon", icon: "✦", color: "#D4A5FF", tier: "community", short: "Recognized for outstanding style", long: "The community has spotlighted their portfolio for standout aesthetic, composition, or a distinctive voice. A Style Icon is someone worth studying." },
  { name: "Local Legend", icon: "📍", color: "#87CEEB", tier: "community", short: "Top creative in their city", long: "Ranked among the most active and highest-rated creatives in their city. Local Legends are the go-to collaborators in their market." },
  { name: "Rising Star", icon: "✦", color: "#98FB98", tier: "achievement", short: "New to Muse, gaining traction", long: "New to Muse and already picking up steam, whether that's 100+ matches or quick early traction. Rising Stars are fresh energy, so connect early." },
  { name: "Full Moon", icon: "🌕", color: "#C0C0FF", tier: "achievement", short: "1 year on Muse", long: "Earned after a full year on the platform. A Full Moon member has been a steady part of the Muse community." },
  { name: "Golden Hour", icon: "☀️", color: "#FFD700", tier: "achievement", short: "50+ shoots completed", long: "Completed 50+ shoots through Muse bookings. Golden Hour creators have delivered at scale and are proven on set." },
  { name: "Collab King", icon: "👑", color: "#FFD700", tier: "achievement", short: "10+ bookings completed", long: "Completed 10+ bookings through Muse. A Collab King has shown they can turn a match into real, paid, finished work." },
  { name: "Social Butterfly", icon: "🦋", color: "#FF69B4", tier: "engagement", short: "500+ messages", long: "Sent 500+ messages on Muse. Social Butterflies are deeply active conversationalists and networkers." },
];

// ── CONNECTION TYPE GLOSSARY ─────────────────────────────────────────────────
const CONN_TYPES = [
  { name: "Collaborator", icon: "🤝", color: "#FFD700", desc: "You want to make work together, like a project, a shoot, or a commission." },
  { name: "Friend", icon: "👥", color: "#87CEEB", desc: "You're looking for creative community and genuine friendship, not just work." },
  { name: "Mentor", icon: "🎓", color: "#98FB98", desc: "You want guidance, teaching, or someone to learn from (or to be that for others)." },
  { name: "Partner", icon: "💞", color: "#FF69B4", desc: "You're open to a deeper romantic or creative-life partnership." },
];

export const CodexScreen = memo(function CodexScreen({
  screen,
  showScreen,
  openHamburger,
  unreadNotificationCount,
}: CodexScreenProps) {
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const [tab, setTab] = useState<"glossary" | "codex">("glossary");

  return (
    <div className={"screen-el" + (screen === "codex" ? " active" : "")}>
      <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}>
        <button className="chat-back" onClick={() => showScreen("profile")}><FiArrowLeft size={20} /></button>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 22, fontWeight: 800, color: "var(--gold)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}><FiBookOpen size={18} /> Glossary + Codex</div>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ display: "flex", gap: 6, margin: "0 16px 12px", padding: 4, background: "rgba(255,255,255,0.04)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
        {([["glossary", "📖 Glossary"], ["codex", "✨ Codex"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "12px 0", borderRadius: 13, border: "none", background: tab === key ? "linear-gradient(135deg,rgba(255,69,0,0.25),rgba(255,215,0,0.15))" : "transparent", color: tab === key ? "var(--gold)" : "var(--text2)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 96px" }}>

        {tab === "glossary" && (
          <>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.5 }}>The glossary explains every badge, role, connection type, and aesthetic on Muse. Tap any item for the full definition.</p>
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
            <Section title="🎭 Creative Types" subtitle="The role you play on set and in a collaboration, your main discipline.">
              {CODEX_TYPES.map(t => <Expandable key={t.name} icon={t.icon} name={t.name} short={t.long.split(". ")[0] + "."} long={t.long} color="#FFD700" />)}
            </Section>
            <Section title="🖌️ Aesthetics / Styles" subtitle="The visual and creative styles you work in.">
              {CODEX_AESTHETICS.map(a => <Expandable key={a.name} icon="🎨" name={a.name} short={a.long.split(". ")[0] + "."} long={a.long} color="#FFB5C2" />)}
            </Section>
            <Section title="💞 Connection Types" subtitle="What you're looking for in a match.">
              {CONN_TYPES.map(c => <Expandable key={c.name} icon={c.icon} name={c.name} short={c.desc} long={c.desc} color={c.color} />)}
            </Section>
          </>
        )}

        {tab === "codex" && (
          <>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.5 }}>The codex is the deeper system — personality, compatibility, and how matching actually works.</p>
            <Section title="🌞 Western Zodiac" subtitle="Your sun sign, based on your birth date. It's the heart of your creative identity and drive." howTo="Find yours: it's the sign the Sun was in on your birthday (for example, Mar 21 to Apr 19 is Aries)." why="Why it matters: it shapes how you approach work, collaborate, and express yourself, and it powers zodiac match compatibility.">
              {CODEX_ZODIAC.map(z => <Expandable key={z.name} icon={z.icon} name={`${z.name}, ${z.tag}`} short={z.short} long={z.long} color="#FFD700" />)}
            </Section>
            <Section title="🐉 Chinese Zodiac" subtitle="Your year animal, based on the lunar calendar year you were born. It reflects temperament and instinct." howTo="Find yours: your animal is set by your birth year in a 12-year cycle (for example, 2000 is Dragon, 2001 is Snake)." why="Why it matters: it reveals your instinct, temperament, and natural working style, and it feeds match compatibility.">
              {CODEX_CHINESE.map(c => <Expandable key={c.name} icon={c.icon} name={c.name} short={c.short} long={c.long} color="#FF8A80" />)}
            </Section>
            <Section title="🧠 MBTI (16 Personality Types)" subtitle="A framework of 16 types built on 4 dimensions: Introversion/Extraversion, Sensing/Intuition, Thinking/Feeling, and Judging/Perceiving." howTo="Find yours: take a free personality assessment. It's a self-report questionnaire, not a scientific test." why="Why it matters: it shows how you think, communicate, create, and collaborate, and which types you naturally work best with.">
              {CODEX_MBTI.map(m => <Expandable key={m.code} icon="🧠" name={`${m.code}, ${m.tag}`} short={m.short} long={`${m.long} You'll click best with ${m.best}.`} color="#D4A5FF" />)}
            </Section>
            <Section title="🔢 Life Path Numbers" subtitle="Derived from your full birth date by reducing each part to a single digit and adding them up. A core numerology concept." howTo="Find yours: add every digit of your birth date (month + day + year) and reduce to one digit, except the Master Numbers 11, 22, and 33." why="Why it matters: it's your life's blueprint, your strengths, challenges, and purpose, and it feeds match compatibility.">
              {CODEX_LIFE_PATH.map(n => <Expandable key={n.n} icon="🔢" name={`Life Path ${n.n}, ${n.title}`} short={n.title} long={n.long} color="#98FB98" />)}
            </Section>
            <Section title="⚖️ How Match % Works" subtitle="The compatibility score on every profile.">
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16, fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
                <div>• Starts at 40% baseline.</div>
                <div>• <b>Shared styles</b>: up to +21%.</div>
                <div>• <b>Complementary looking-for</b>: +15%.</div>
                <div>• <b>Role match</b>: +8%.</div>
                <div>• <b>Zodiac compatibility</b>: up to +6%.</div>
                <div>• <b>Chinese zodiac match</b>: +6%.</div>
                <div>• <b>MBTI compatibility</b>: up to +5%.</div>
                <div>• <b>Life path match</b>: +5%.</div>
                <div>• <b>Verified</b>: +3%; <b>50+ collabs</b>: +2%.</div>
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

function Section({ title, subtitle, howTo, why, children }: { title: string; subtitle?: string; howTo?: string; why?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, marginBottom: 8 }}>{subtitle}</div>}
      {(howTo || why) && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 10, marginBottom: 12, fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
          {howTo && <div style={{ marginBottom: 4 }}>🔍 <b>How it's determined:</b> {howTo}</div>}
          {why && <div>💡 <b>Why it matters:</b> {why}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Expandable({ icon, name, short, long, color }: { icon: string; name: string; short: string; long: string; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(o => !o)} style={{ width: "100%", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", marginBottom: 8, borderRadius: 14, background: "rgba(255,255,255,0.025)", border: `1px solid ${open ? color + "40" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", transition: "all .25s" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: `${color}20`, border: `1px solid ${color}40`, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", flex: 1 }}>{name}</div>
          <div style={{ color: "var(--muted)", fontSize: 15, transition: "transform .25s", transform: open ? "rotate(90deg)" : "none", flexShrink: 0 }}>›</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{short}</div>
        {open && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{long}</div>}
      </div>
    </button>
  );
}

export default CodexScreen;
