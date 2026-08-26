"use client";
import { useState, useEffect, useCallback } from "react";
import { FiX, FiCheck, FiStar } from "react-icons/fi";

interface QuestPanelProps {
  show: boolean;
  onClose: () => void;
  apiFetch: (url: string, opts?: any) => Promise<any>;
  showToast: (msg: string) => void;
  onRewardGranted?: (rewardType: string, amount: number) => void;
  onClaimablesChange?: (count: number) => void;
  onQuestsChange?: () => void;
  loginStreak?: number;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter:   { label: "Starter",   color: "#98FB98", bg: "rgba(152,251,152,0.08)",  border: "rgba(152,251,152,0.2)" },
  daily:     { label: "Daily",     color: "#87CEEB", bg: "rgba(135,206,235,0.08)",  border: "rgba(135,206,235,0.2)" },
  weekly:    { label: "Weekly",    color: "#FFD700", bg: "rgba(255,215,0,0.08)",    border: "rgba(255,215,0,0.2)" },
  monthly:   { label: "Monthly",   color: "#D4A5FF", bg: "rgba(212,165,255,0.08)",  border: "rgba(212,165,255,0.2)" },
  season:    { label: "Season",    color: "#FF69B4", bg: "rgba(255,105,180,0.08)",  border: "rgba(255,105,180,0.2)" },
  legendary: { label: "Legendary", color: "#FF8A80", bg: "rgba(255,138,128,0.08)",  border: "rgba(255,138,128,0.2)" },
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
      setNearQuests((data.quests || []).filter((q: any) => !q.completed && q.progress / q.target >= 0.6));
      onQuestsChange?.();
    } catch (e) { console.warn("[Sparks] fetch failed:", e); }
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

  // Mirrors server: level = floor(sqrt(xp/50)) + 1, so level L spans
  // [50*(L-1)^2, 50*L^2) XP.
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
            <FiStar size={22} color="#FFD700" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Sparks</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>Complete challenges, earn rewards</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", padding: 8 }}><FiX size={20} /></button>
        </div>

        {/* XP Bar */}
        <div className="quest-xp-bar">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFD700" }}>Level {xp.level}</span>
            <span style={{ fontSize: 11, color: "var(--text2)" }}>{xp.total_xp} XP</span>
          </div>
          <div className="quest-xp-track">
            <div className="quest-xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{Math.max(0, xpForLevel - xpIntoLevel)} XP to level {xp.level + 1}</span>
            {claimableCount > 0 && (
              <span style={{ fontSize: 10, color: "#FFD700", fontWeight: 700 }}>{claimableCount} reward{claimableCount > 1 ? "s" : ""} ready</span>
            )}
          </div>
        </div>

        {/* Streak Bar */}
        <div className="streak-bar">
          <span className="streak-flame">🔥</span>
          <span className="streak-num">{loginStreak}</span>
          <span className="streak-label">day streak</span>
          <div className="streak-dots">
            {[0,1,2,3,4,5,6].map(i => (
              <div key={i} className={`streak-dot${i < loginStreak ? " filled" : ""}`} />
            ))}
          </div>
        </div>

        {/* Near-Quests Widget */}
        {nearQuests.length > 0 && (
          <div className="near-quests">
            {nearQuests.slice(0, 4).map((q: any) => {
              const pct = Math.round((q.progress / q.target) * 100);
              return (
                <div key={q.id} className="near-quest-pill">
                  <span className="nq-icon">{q.icon}</span>
                  <span>{q.title}</span>
                  <span className="nq-pct">{pct}%</span>
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
                {cfg.label} {count > 0 && <span className="quest-filter-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Quest List */}
        <div className="quest-list">
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 13 }}>No sparks in this category</div>
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
                  <div className="quest-card-info">
                    <div className="quest-card-title">{q.title}</div>
                    <div className="quest-card-desc">{q.description}</div>
                  </div>
                  <div className="quest-card-reward" style={{ color: tier.color }}>
                    {q.reward_amount > 1 ? `${q.reward_amount}× ` : ""}{q.reward_label}
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
                    {claimingId === q.id ? "Claiming..." : `Claim ${q.reward_label}`}
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
