"use client";

import { useState, useEffect } from "react";
import { getAccessToken, authFetch } from "../lib/auth-client";

type ReferralData = {
  code: string;
  referralUrl: string;
  totalReferrals: number;
  signedUp: number;
  subscribed: number;
  freeMonthsEarned: number;
  referrals: any[];
  rewards: any[];
};

type Props = {
  onClose: () => void;
};

export default function ReferralPanel({ onClose }: Props) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authFetch("/api/muse/referral", {
      method: "POST",
      body: JSON.stringify({ action: "status" }),
    }).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const copyCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ color: "#f5f0ff", fontSize: 14 }}>Loading referral data...</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 20, padding: 28, maxWidth: 480, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffd700" }}>🎁 Refer Friends</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* How it works */}
        <div style={{ padding: 16, background: "rgba(255,215,0,0.06)", borderRadius: 12, marginBottom: 16, borderLeft: "3px solid #ffd700" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700", marginBottom: 8 }}>How it works</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
            1. Share your referral code with a friend<br/>
            2. They sign up using your code<br/>
            3. When they subscribe to Muse Pro, you BOTH get a free month
          </div>
        </div>

        {/* Referral code */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Your referral code</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#ffd700", fontSize: 16, fontWeight: 700, fontFamily: "monospace", letterSpacing: 2 }}>
              {data?.code || "Loading..."}
            </div>
            <button onClick={copyCode} style={{ padding: "12px 16px", borderRadius: 10, background: copied ? "rgba(78,205,196,0.2)" : "rgba(255,215,0,0.15)", border: "none", color: copied ? "#4ecdc4" : "#ffd700", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Share link */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Or share this link</div>
          <div onClick={copyLink} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", wordBreak: "break-all" }}>
            {data?.referralUrl || "Loading..."}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Referred", value: data?.totalReferrals || 0 },
            { label: "Signed Up", value: data?.signedUp || 0 },
            { label: "Free Months", value: data?.freeMonthsEarned || 0 },
          ].map(s => (
            <div key={s.label} style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#ffd700" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent referrals */}
        {data?.referrals && data.referrals.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Recent Referrals</div>
            {data.referrals.slice(0, 5).map((r: any) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  {r.referee_id?.avatar ? <img src={r.referee_id.avatar} alt="" style={{ width: 32, height: 32, borderRadius: 16, objectFit: "cover" }} /> : "👤"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#f5f0ff" }}>{r.referee_id?.name || "Friend"}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: r.status === "reward_issued" ? "rgba(78,205,196,0.15)" : "rgba(255,215,0,0.1)", color: r.status === "reward_issued" ? "#4ecdc4" : "#ffd700" }}>
                  {r.status === "reward_issued" ? "✓ Rewarded" : r.status === "subscribed" ? "Subscribed" : r.status === "signed_up" ? "Signed Up" : "Pending"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

