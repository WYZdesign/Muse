"use client";
import { useState, useEffect, useCallback } from "react";
import { FiX, FiCheck, FiStar } from "react-icons/fi";

interface QuestPanelProps {
  show: boolean;
  onClose: () => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  onRewardGranted?: (rewardType: string, amount: number) => void;
  onClaimablesChange?: (count: number) => void;
  onQuestsChange?: () => void;
  loginStreak?: number;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter:   { label: "Starter",   color: "#98FB98", bg: "rgba(152,251,152,0.12)",  border: "rgba(152,251,152,0.3)" },
  daily:     { label: "Daily",     color: "#87CEEB", bg: "rgba(135,206,235,0.12)",  border: "rgba(135,206,235,0.3)" },
  weekly:    { label: "Weekly",    color: "#FFD700", bg: "rgba(255,215,0,0.12)",    border: "rgba(255,215,0,0.3)" },
  monthly:   { label: "Monthly",   color: "#D4A5FF", bg: "rgba(212,165,255,0.12)",  border: "rgba(212,165,255,0.3)" },
  season:    { label: "Season",    color: "#FF69B4", bg: "rgba(255,105,180,0.12)",  border: "rgba(255,105,180,0.3)" },
  legendary: { label: "Legendary", color: "#FF8A80", bg: "rgba(255,138,128,0.12)",  border: "rgba(255,138,128,0.3)" },
};

export default function QuestPanel({ show, onClose, apiFetch, showToast, onRewardGranted, onClaimablesChange, onQuestsChange, loginStreak = 0 }: QuestPanelProps) {
  const [quests, setQuests] = useState<any[]>([]);
  const [xp, setXp] = useState({ total_xp: 0, level: 1 });
  const [filter, setFilter] = useState<string>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [nearQuests, setNearQuests] = useState<any[]>([]);

  const fetchQuests = useCallback(async () => {
    try {
      const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-quests" }) });
      const data = await res.json();
      setQuests(data.quests || []);
      setXp(data.xp || { total_xp: 0, level: 1 });
      onClaimablesChange?.((data.quests || []).filter((q: any) => q.completed && !q.claimed).length);
      setNearQuests((data.quests || []).filter((q: any) => !q.completed && q.progress / q.target >= 0.5).sort((a: any, b: any) => (b.progress / b.target) - (a.progress / a.target)).slice(0, 3));
      onQuestsChange?.();
    } catch (e) { console.warn("[Commissions] fetch failed:", e); }
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

  const filtered = filter === "all" ? quests : quests.filter(q => q.quest_tier === filter);
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
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Commissions</div>
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
          <div className="quest-hero-streak">
            <span className="streak-flame">🔥</span>
            <span className="streak-num">{loginStreak}</span>
            <span className="streak-label">day streak</span>
            <div className="streak-dots">
              {[0,1,2,3,4,5,6].map(i => (
                <div key={i} className={`streak-dot${i < loginStreak ? " filled" : ""}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Near-Completion Widget */}
        {nearQuests.length > 0 && (
          <div className="quest-near-section">
            <div className="quest-near-title">Almost there</div>
            {nearQuests.map((q: any) => {
              const pct = Math.round((q.progress / q.target) * 100);
              const tier = TIER_CONFIG[q.quest_tier] || TIER_CONFIG.weekly;
              return (
                <div key={q.id} className="quest-near-card">
                  <div className="quest-near-icon" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                    {q.icon}
                  </div>
                  <div className="quest-near-info">
                    <div className="quest-near-name">{q.title}</div>
                    <div className="quest-near-progress-row">
                      <div className="quest-near-bar">
                        <div className="quest-near-fill" style={{ width: `${pct}%`, background: tier.color }} />
                      </div>
                      <span className="quest-near-pct" style={{ color: tier.color }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter Tabs */}
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

        {/* Quest Grid */}
        <div className="quest-grid">
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 13 }}>No commissions in this category</div>
          )}
          {filtered.map((q: any) => {
            const tier = TIER_CONFIG[q.quest_tier] || TIER_CONFIG.weekly;
            const pct = Math.min(100, (q.progress / q.target) * 100);
            const isClaimable = q.completed && !q.claimed;

            return (
              <div key={q.id} className={`quest-card ${q.completed ? "completed" : ""} ${isClaimable ? "claimable" : ""}`} style={{ borderLeftColor: tier.color }}>
                <div className="quest-card-top">
                  <div className="quest-card-icon" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                    {q.icon}
                  </div>
                  <div className="quest-card-reward" style={{ color: tier.color }}>
                    {q.reward_amount > 1 ? `${q.reward_amount}× ` : ""}{q.reward_label}
                  </div>
                </div>
                <div className="quest-card-title">{q.title}</div>

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
