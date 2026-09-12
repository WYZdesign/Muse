"use client";
import { useState, useEffect, useCallback } from "react";
import { FiX, FiCheck, FiStar } from "react-icons/fi";
import StreakWidget from "../components/StreakWidget";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { rotateQuests } from "@/lib/questEngine";

interface QuestPanelProps {
  show: boolean;
  onClose: () => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  onRewardGranted?: (rewardType: string, amount: number) => void;
  onClaimablesChange?: (count: number) => void;
  onQuestsChange?: () => void;
  loginStreak?: number;
  weeklyLogins?: boolean[];
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter:   { label: "Starter",   color: "#98FB98", bg: "rgba(152,251,152,0.12)",  border: "rgba(152,251,152,0.3)" },
  daily:     { label: "Daily",     color: "#87CEEB", bg: "rgba(135,206,235,0.12)",  border: "rgba(135,206,235,0.3)" },
  weekly:    { label: "Weekly",    color: "#FFD700", bg: "rgba(255,215,0,0.12)",    border: "rgba(255,215,0,0.3)" },
  monthly:   { label: "Monthly",   color: "#D4A5FF", bg: "rgba(212,165,255,0.12)",  border: "rgba(212,165,255,0.3)" },
  season:    { label: "Season",    color: "#FF69B4", bg: "rgba(255,105,180,0.12)",  border: "rgba(255,105,180,0.3)" },
  legendary: { label: "Legendary", color: "#FF8A80", bg: "rgba(255,138,128,0.12)",  border: "rgba(255,138,128,0.3)" },
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
];

// Concise one-line objective shown when a quest is expanded. Prefers the
// backend description; when that's empty, derives a short sentence from the
// quest title/type so the card never reads "No description available."
function deriveQuestDescription(q: any): string {
  const desc = typeof q?.description === "string" ? q.description.trim() : "";
  if (desc) return desc;
  const t = String(q?.title || "").toLowerCase();
  if (t.includes("login") || t.includes("log in") || t.includes("check in")) return "Log in to Muse today";
  if (t.includes("like")) return "Like a post to show some love";
  if (t.includes("comment") || t.includes("reply")) return "Leave a comment on a post";
  if (t.includes("post") || t.includes("share") || t.includes("upload")) return "Share something with the community";
  if (t.includes("follow") || t.includes("connect") || t.includes("friend")) return "Connect with other creatives";
  if (t.includes("swipe") || t.includes("browse") || t.includes("discover")) return "Swipe through profiles on Discover";
  if (t.includes("profile")) return "Update your Muse profile";
  if (t.includes("message") || t.includes("chat") || t.includes("dm")) return "Send a message to a match";
  if (t.includes("book") || t.includes("session")) return "Book a session with a pro";
  if (t.includes("streak")) return "Keep your daily login streak going";
  if (t.includes("bts") || t.includes("moment")) return "Post a behind-the-scenes moment";
  return `Complete "${q?.title || "this quest"}" to earn your reward`;
}

export default function QuestPanel({ show, onClose, apiFetch, showToast, onRewardGranted, onClaimablesChange, onQuestsChange, loginStreak = 0, weeklyLogins = [false,false,false,false,false,false,false] }: QuestPanelProps) {
  const [allQuests, setAllQuests] = useState<any[]>([]);
  const [xp, setXp] = useState({ total_xp: 0, level: 1 });
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [streakOpen, setStreakOpen] = useState(true);

  const quests = rotateQuests(allQuests);

  const fetchQuests = useCallback(async () => {
    try {
      const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-quests" }) });
      const data = await res.json();
      setAllQuests(data.quests || []);
      setXp(data.xp || { total_xp: 0, level: 1 });
      onClaimablesChange?.((data.quests || []).filter((q: any) => q.completed && !q.claimed).length);
      onQuestsChange?.();
    } catch (e) { console.warn("[Quests] fetch failed:", e); }
  }, [apiFetch, onClaimablesChange, onQuestsChange]);

  useEffect(() => { if (show) fetchQuests(); }, [show, fetchQuests]);

  const claimReward = async (questId: string) => {
    setClaimingId(questId);
    try {
      const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "claim-quest", quest_id: questId }) });
      const data = await res.json();
      if (data.success && data.reward) {
        if (data.grantedUntil) {
          showToast(`👑 ${data.reward.reward_label} — Pro until ${new Date(data.grantedUntil).toLocaleDateString()}`);
        } else {
          onRewardGranted?.(data.reward.reward_type || "like", data.reward.reward_amount || 1);
          showToast(`✓ Claimed: ${data.reward.reward_label || "Reward"}`);
        }
        fetchQuests();
      } else {
        showToast(data.error || "Could not claim reward");
      }
    } catch { showToast("Could not claim reward"); }
    setClaimingId(null);
  };

  const visible = quests.filter(q => filter === "all" || q.quest_tier === filter);
  const claimableCount = quests.filter(q => q.completed && !q.claimed).length;

  const xpIntoLevel = xp.total_xp - 50 * Math.pow(xp.level - 1, 2);
  const xpForLevel = 50 * (Math.pow(xp.level, 2) - Math.pow(xp.level - 1, 2));
  const xpPct = Math.max(0, Math.min(100, (xpIntoLevel / Math.max(xpForLevel, 1)) * 100));

  const panelRef = useFocusTrap(show, onClose);

  if (!show) return null;

  return (
      <div className="quest-overlay" role="presentation" aria-hidden="true" onClick={onClose}>
        <div ref={panelRef} className="quest-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="quest-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #FFD700, #FF8A80)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FiStar size={18} color="var(--text)" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Quests</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>Complete challenges, earn rewards</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", padding: 8 }}><FiX size={20} /></button>
        </div>

        {/* XP + Streak Row */}
        <div className="quest-hero-stats">
          <div className="quest-hero-xp">
            <div className="quest-hero-level">
              <span className="quest-hero-level-num">{xp.level}</span>
              <span className="quest-hero-level-label">Level</span>
            </div>
            <div className="quest-hero-xp-right">
              <div className="quest-xp-track" style={{ height: 8, borderRadius: 4 }}>
                <div className="quest-xp-fill" style={{ width: `${xpPct}%`, borderRadius: 4 }} />
              </div>
              <div className="quest-xp-meta">
                <span>{xp.total_xp} XP</span>
                <span>{Math.max(0, xpForLevel - xpIntoLevel)} XP to next</span>
              </div>
            </div>
          </div>
          {streakOpen ? (
            <div
              role="button"
              tabIndex={0}
              aria-expanded={streakOpen}
              onClick={() => setStreakOpen(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStreakOpen(false); } }}
              style={{ flexShrink: 0, cursor: "pointer" }}
            >
              <StreakWidget weeklyLogins={weeklyLogins} loginStreak={loginStreak} />
              <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>▲ Collapse</div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-expanded={streakOpen}
              onClick={() => setStreakOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStreakOpen(true); } }}
              style={{ flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}
            >
              <span style={{ fontSize: 22 }}>🔥</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>{loginStreak}</span>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>day streak</span>
              <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 13 }}>▼</span>
            </div>
          )}
        </div>

        {/* Filter Tabs — color-fill when selected */}
        <div style={{ display: "flex", gap: 8, padding: "16px 20px 0", flexShrink: 0 }}>
          {FILTER_OPTIONS.map(f => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all .2s",
                  background: isActive ? "linear-gradient(135deg, #FFD700, #FFA500)" : "var(--card-bg)",
                  color: isActive ? "var(--text)" : "var(--text2)",
                  boxShadow: isActive ? "0 2px 12px rgba(255,215,0,0.25)" : "none",
                }}
              >
                {f.label}
                {f.key === "all" && claimableCount > 0 && (
                  <span style={{
                    marginLeft: 6,
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 99,
                    background: isActive ? "rgba(0,0,0,0.15)" : "var(--border-subtle)",
                  color: isActive ? "var(--text)" : "var(--text2)",
                    fontWeight: 800,
                  }}>{claimableCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Claimable banner */}
        {claimableCount > 0 && (
          <div style={{
            margin: "14px 20px 0",
            padding: "10px 16px",
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,138,128,0.08))",
            border: "1px solid rgba(255,215,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            color: "#FFD700",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 16, display: "none" }}>🎁</span>
            {claimableCount} quest{claimableCount !== 1 ? "s" : ""} ready to claim!
          </div>
        )}

        {/* Quest List */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "14px 16px 52px", display: "flex", flexDirection: "column", gap: 10, WebkitOverflowScrolling: "touch" }}>
          {visible.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center", gap: 12 }}>
              <div style={{ fontSize: 36 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No quests in this category</div>
              <div style={{ fontSize: 13, color: "var(--text2)", maxWidth: 280 }}>Switch to a different filter or check back later.</div>
            </div>
          )}
          {visible.map((q: any) => {
            const tier = TIER_CONFIG[q.quest_tier] || TIER_CONFIG.weekly;
            const pct = q.target > 0 ? Math.min(100, (q.progress / q.target) * 100) : 0;
            const isClaimable = q.completed && !q.claimed;
            const isExpanded = expandedId === q.id;

            return (
              <div
                key={q.id}
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  minHeight: 72,
                  boxSizing: "border-box",
                  borderRadius: 14,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: isClaimable
                    ? "linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,138,128,0.04))"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isClaimable ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.06)"}`,
                  boxShadow: isClaimable ? "0 2px 8px rgba(255,215,0,0.08)" : "none",
                  transition: "all .2s",
                  opacity: q.completed && !isClaimable ? 0.6 : 1,
                }}
              >
                {/* Color-fill left strip */}
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  background: tier.color,
                  borderRadius: "14px 0 0 14px",
                }} />

                {/* Main row: emoji  Name  +reward  |  progress */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "18px 16px 16px 22px",
                  gap: 12,
                  minHeight: 72,
                  flexWrap: "wrap",
                }}>
                  {/* Emoji — no bubble, just raw character */}
                  <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{q.icon}</span>

                  {/* Name + reward */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                      display: "block",
                      flex: "1 1 60%",
                      minWidth: 0,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      lineHeight: 1.3,
                    }}>{q.title}</span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: tier.color,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}>+{q.reward_amount > 1 ? `${q.reward_amount}× ` : ""}{q.reward_label}</span>
                  </div>

                  {/* Claim button (if claimable) */}
                  {isClaimable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); claimReward(q.id); }}
                      disabled={claimingId === q.id}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
                        color: "var(--text)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        flexShrink: 0,
                        opacity: claimingId === q.id ? 0.6 : 1,
                      }}
                    >
                      {claimingId === q.id ? "..." : "Claim"}
                    </button>
                  )}

                  {/* Claimed badge */}
                  {q.completed && q.claimed && !isClaimable && (
                    <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <FiCheck size={12} /> Claimed
                    </span>
                  )}

                  {/* Expand chevron */}
                  <span style={{
                    fontSize: 12,
                    color: "var(--text2)",
                    transition: "transform .2s",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    flexShrink: 0,
                  }}>›</span>
                </div>

                {/* Thin progress bar at bottom of tab */}
                <div style={{ padding: "0 16px 10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      borderRadius: 2,
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, #FFD700, #FF8A80)",
                      transition: "width .4s cubic-bezier(.4,0,.2,1)",
                    }} />
                  </div>
                  <span style={{
                    fontSize: 11,
                    color: "var(--text2)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>{q.progress}/{q.target}</span>
                </div>

                {/* Expanded description area — accordion push */}
                {isExpanded && (
                  <div style={{
                    padding: "0 16px 14px 20px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{
                      fontSize: 13,
                      color: "var(--text2)",
                      lineHeight: 1.5,
                      paddingTop: 10,
                    }}>
                      {deriveQuestDescription(q)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimal scoped styles for quest-list scrollbar */}
      <style>{`
        .quest-panel div[style*="overflow-y: auto"]::-webkit-scrollbar { width: 4px; }
        .quest-panel div[style*="overflow-y: auto"]::-webkit-scrollbar-track { background: transparent; }
        .quest-panel div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.3); border-radius: 99px; }
      `}</style>
    </div>
  );
}
