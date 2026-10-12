// Full-screen professional profile overlay for NetworkScreen's "pros" tab.
// Pure presentational component — all state (proDetail, connectedIds, etc.)
// stays in NetworkScreen; this just renders it and forwards callbacks.
"use client";

import Image from "next/image";
import { FiBriefcase, FiMapPin, FiShare2 } from "react-icons/fi";
import type { Professional } from "./types";
import { buildProfessionalBadges } from "./badgeColors";
import { STYLE_FULL, type BadgeInfo } from "./badgeInfo";
import type { ChatLaunchTarget } from "../page-models";

const SKILL_COLORS = [
  { bg: "rgba(212,165,255,0.18)", border: "rgba(212,165,255,0.35)", color: "#e6d3ff" },
  { bg: "rgba(100,181,246,0.18)", border: "rgba(100,181,246,0.35)", color: "#90caf9" },
  { bg: "rgba(0,188,212,0.18)", border: "rgba(0,188,212,0.35)", color: "#4dd0e1" },
  { bg: "rgba(255,215,0,0.18)", border: "rgba(255,215,0,0.35)", color: "#ffd54f" },
  { bg: "rgba(129,199,132,0.18)", border: "rgba(129,199,132,0.35)", color: "#a5d6a7" },
  { bg: "rgba(255,138,128,0.18)", border: "rgba(255,138,128,0.35)", color: "#ffab91" },
];

function getSkillColor(i: number) {
  return SKILL_COLORS[i % SKILL_COLORS.length];
}

export function generateBio(exp: string, skills: string[]): string {
  const years = parseInt(exp, 10) || 0;
  const main = skills[0] || "creative work";
  if (years >= 10)
    return `A seasoned professional with ${years}+ years in ${main}. Deep expertise across ${skills.join(", ")}. Passionate about pushing creative boundaries.`;
  if (years >= 5)
    return `Experienced in ${main} with ${years} years of hands-on work. Skilled in ${skills.join(", ")}. Always looking for the next challenge.`;
  return `Rising talent in ${main} with ${years} years of practice. Exploring ${skills.join(", ")} and eager to collaborate.`;
}

export interface NetworkProDetailModalProps {
  proDetail: Professional;
  onClose: () => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  connectedIds: Set<number>;
  connectLoading: number | null;
  onConnect: (p: Professional) => void;
  onShare: (p: Professional) => void;
  onOpenChat: (m: ChatLaunchTarget) => void;
  iAmIndustry: boolean;
  onBadgeInfo: (info: BadgeInfo | null) => void;
}

export function NetworkProDetailModal({
  proDetail,
  onClose,
  handleImgError,
  connectedIds,
  connectLoading,
  onConnect,
  onShare,
  onOpenChat,
  iAmIndustry,
  onBadgeInfo,
}: NetworkProDetailModalProps) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto" }}
      role="presentation"
      aria-hidden="true"
      onClick={onClose}
    >
      <div role="presentation" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxWidth: 480, marginTop: "env(safe-area-inset-top, 0px)", background: "linear-gradient(135deg,#0d0520,#1a0a2e,#0d0520)", borderRadius: "0 0 24px 24px", overflow: "hidden", display: "flex", flexDirection: "column", marginBottom: 16 }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 10, background: "transparent", border: "none", color: "#fff", fontSize: 20, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
        >
          {"✕"}
        </button>

        <div style={{ position: "relative", height: 420, flexShrink: 0 }}>
          <Image src={proDetail.img} alt={proDetail.name} fill sizes="(max-width: 600px) 100vw, 500px" style={{ objectFit: "cover" }} onError={handleImgError} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(13,5,32,1) 0%,rgba(13,5,32,0.7) 40%,rgba(13,5,32,0.2) 70%,transparent 100%)" }} />
          <div style={{ position: "absolute", bottom: 20, left: 24, right: 24 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 6, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>{proDetail.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--gold)", marginBottom: 4 }}>
              <FiBriefcase size={14} /> {proDetail.type}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
              <FiMapPin size={13} /> {proDetail.loc}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
            {generateBio(proDetail.exp, proDetail.skills || [])}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 8 }}>Skills</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(proDetail.skills || []).map((s: string, i: number) => {
                const sc = getSkillColor(i);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => onBadgeInfo({ name: s, desc: STYLE_FULL[s] || `A skill this professional brings to a project.`, icon: "🛠", color: sc.color })}
                    style={{ minHeight: 44, fontSize: 12, padding: "5px 14px", borderRadius: 99, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 600, cursor: "pointer" }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 8 }}>Badges</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(() => {
                const badges = buildProfessionalBadges(proDetail, { connected: connectedIds.has(proDetail.id) });
                return badges.map((b) => (
                  <button type="button" key={b.label} onClick={() => onBadgeInfo({ name: b.label, desc: STYLE_FULL[b.label] || `A signal about this pro: ${b.label}.`, icon: b.icon, color: b.c })} style={{ minHeight: 44, fontSize: 11, padding: "4px 11px", borderRadius: 99, background: b.bg, border: `1px solid ${b.bd}`, color: b.c, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    {b.icon} {b.label}
                  </button>
                ));
              })()}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>{proDetail.exp}</div>
              <div style={{ fontSize: 10, color: "var(--text2)" }}>Experience</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>{proDetail.openings}</div>
              <div style={{ fontSize: 10, color: "var(--text2)" }}>Openings</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>{connectedIds.has(proDetail.id) ? 1 : 0}</div>
              <div style={{ fontSize: 10, color: "var(--text2)" }}>Connected</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                disabled={connectedIds.has(proDetail.id) || connectLoading === proDetail.id}
                style={{
                  flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "none",
                  cursor: connectedIds.has(proDetail.id) || connectLoading === proDetail.id ? "default" : "pointer",
                  background: connectedIds.has(proDetail.id) ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,var(--coral),var(--gold))",
                  color: connectedIds.has(proDetail.id) ? "var(--text2)" : "#fff",
                  opacity: connectLoading === proDetail.id ? 0.7 : 1,
                  transition: "all 0.3s",
                }}
                onClick={() => onConnect(proDetail)}
              >
                {connectedIds.has(proDetail.id) ? "✓ Requested" : connectLoading === proDetail.id ? "Sending..." : iAmIndustry ? "Network" : "Connect"}
              </button>
              <button
                style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, borderRadius: 12, border: "1px solid rgba(0,188,212,0.3)", background: "transparent", color: "#00BCD4", cursor: "pointer" }}
                onClick={() => {
                  onOpenChat({ id: proDetail.profileId || proDetail.id, name: proDetail.name, type: proDetail.type || "Creative", img: proDetail.img, messages: [] });
                  onClose();
                }}
              >
                Message
              </button>
            </div>
            <button
              style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 600, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onClick={() => onShare(proDetail)}
            >
              <FiShare2 size={14} /> Share Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
