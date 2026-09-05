"use client";
import { useState, useEffect, useCallback } from "react";
import { FiX, FiCheck, FiStar } from "react-icons/fi";
import StreakWidget from "../components/StreakWidget";
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

export default function QuestPanel({ show, onClose, apiFetch, showToast, onRewardGranted, onClaimablesChange, onQuestsChange, loginStreak = 0, weeklyLogins = [false,false,false,false,false,false,false] }: QuestPanelProps) {
  const [allQuests, setAllQuests] = useState<any[]>([]);
  const [xp, setXp] = useState({ total_xp: 0, level: 1 });
  const [filter, setFilter] = useState<string>("all");
  // Session 85: Torreé asked for two tabs — "top" shows the 4 quests closest to being
  // claimed (or already claimable), "all" shows the full list with the tier bubbles.
  // This replaces the old "tracking" (in-progress) vs "all" split and the separate
  // "Almost there" near-completion widget, which the new top-4 tab supersedes.
  const [view, setView] = useState<"top" | "all">("top");
  const [claimingId, setClaimingId] = useState<string | null>(null);

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

  // "Top 4" tab: quests closest to being claimed. Claimable quests (100%, just waiting
  // to be claimed) sort first since they're literally as close as it gets; everything
  // else ranks by progress ratio descending. Already-claimed quests are excluded — they
  // have nothing left to work toward.
  const topFour = [...quests]
    .filter(q => !(q.completed && q.claimed))
    .sort((a, b) => {
      const aClaimable = a.completed && !a.claimed;
      const bClaimable = b.completed && !b.claimed;
      if (aClaimable !== bClaimable) return aClaimable ? -1 : 1;
      return (b.progress / b.target) - (a.progress / a.target);
    })
    .slice(0, 4);
  const visible = view === "top" ? topFour : quests.filter(q => filter === "all" || q.quest_tier === filter);
  const tiers = ["starter", "daily", "weekly", "monthly", "season", "legendary"];
  const claimableCount = quests.filter(q => q.completed && !q.claimed).length;

  const xpIntoLevel = xp.total_xp - 50 * Math.pow(xp.level - 1, 2);
  const xpForLevel = 50 * (Math.pow(xp.level, 2) - Math.pow(xp.level - 1, 2));
  const xpPct = Math.max(0, Math.min(100, (xpIntoLevel / Math.max(xpForLevel, 1)) * 100));

  if (!show) return null;

  return (
    <div className="quest-overlay" role="presentation" aria-hidden="true" onClick={onClose}>
      <div className="quest-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="quest-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #FFD700, #FF8A80)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FiStar size={18} color="#0a0612" />
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
          <StreakWidget weeklyLogins={weeklyLogins} loginStreak={loginStreak} />
        </div>

        {/* View Tabs: Top 4 (closest to claim) vs All (full category list) */}
        <div className="quest-view-tabs">
          <button className={`quest-view-tab ${view === "top" ? "active" : ""}`} onClick={() => setView("top")}>
            <FiStar size={13} /> Top 4 {claimableCount > 0 && <span className="quest-view-count">{claimableCount}</span>}
          </button>
          <button className={`quest-view-tab ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
            <FiCheck size={13} /> All Quests <span className="quest-view-count">{quests.length}</span>
          </button>
        </div>

        {/* Filter Tabs (tier) — only meaningful once you're looking at the full list */}
        {view === "all" && (
          <div className="quest-filters">
            <button className={`quest-filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
            {tiers.map(t => {
              const cfg = TIER_CONFIG[t];
              const count = quests.filter(q => q.quest_tier === t && !q.completed).length;
              return (
                <button key={t} className={`quest-filter-btn ${filter === t ? "active" : ""}`} style={filter === t ? { borderColor: cfg.color, color: cfg.color } : {}} onClick={() => setFilter(t)}>
                  {cfg.label} {count > 0 && <span className="quest-filter-count" style={filter === t ? { background: `${cfg.color}22`, color: cfg.color } : {}}>{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Quest List — full-width rectangle rows */}
        <div className="quest-grid">
          {visible.length === 0 && (
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center", gap: 12 }}>
              <div style={{ fontSize: 36 }}>📋</div>
<div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{view === "top" ? "No quests to claim yet" : "No quests in this category"}</div>
<div style={{ fontSize: 13, color: "var(--text2)", maxWidth: 280 }}>{view === "top" ? "Start a quest to see it here — they populate as you engage on Muse." : "Switch to a different filter or check back later."}</div>
            </div>
          )}
          {visible.map((q: any) => {
            const tier = TIER_CONFIG[q.quest_tier] || TIER_CONFIG.weekly;
            const pct = Math.min(100, (q.progress / q.target) * 100);
            const isClaimable = q.completed && !q.claimed;

            return (
              <div key={q.id} className={`quest-card ${q.completed ? "completed" : ""} ${isClaimable ? "claimable" : ""}`} style={{ borderLeftColor: tier.color }}>
                <div className="quest-card-row">
                  <div className="quest-card-icon" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                    {q.icon}
                  </div>
                  <div className="quest-card-main">
                    <div className="quest-card-title">{q.title}</div>
                    <div className="quest-card-sub">
                      <span style={{ color: tier.color }}>{tier.label}</span>
                      <span className="quest-card-reward" style={{ color: tier.color }}>{q.reward_amount > 1 ? `${q.reward_amount}× ` : ""}{q.reward_label}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="quest-progress-wrap">
                  <div className="quest-progress-track">
                    <div className="quest-progress-fill" style={{ width: `${pct}%`, background: tier.color }} />
                  </div>
                  <span className="quest-progress-text">{q.progress}/{q.target}</span>
                </div>

                {/* Claim Button */}
                {isClaimable && (
                  <button
                    className="quest-claim-btn"
                    style={{ background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)` }}
                    onClick={() => claimReward(q.id)}
                    disabled={claimingId === q.id}
                  >
                    {claimingId === q.id ? "..." : `Claim`}
                  </button>
                )}
                {q.completed && q.claimed && (
                  <div className="quest-claimed-badge"><FiCheck size={12} /> Claimed</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
