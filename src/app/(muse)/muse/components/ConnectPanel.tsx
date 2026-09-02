"use client";

import { useState, useEffect } from "react";
import { authFetch } from "../lib/auth-client";

type ConnectStatus = {
  connected: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  onboardingComplete?: boolean;
  onboardingUrl?: string;
};

type Props = {
  onClose: () => void;
};

export default function ConnectPanel({ onClose }: Props) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/muse/connect", {
      method: "POST",
      body: JSON.stringify({ action: "account-status" }),
    }).then(r => r.json()).then(d => { if (!cancelled) { setStatus(d); setLoading(false); } }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const startOnboarding = async () => {
    setConnecting(true);
    try {
      const r = await authFetch("/api/muse/connect", {
        method: "POST",
        body: JSON.stringify({ action: "create-account" }),
      });
      const d = await r.json();
      if (d.onboardingUrl) {
        window.location.href = d.onboardingUrl;
      } else if (d.onboardingComplete) {
        setStatus({ connected: true, chargesEnabled: d.chargesEnabled, payoutsEnabled: d.payoutsEnabled, onboardingComplete: true });
      } else if (d.error) {
        alert(d.error);
      }
    } catch { alert("Could not start onboarding — try again"); }
    setConnecting(false);
  };

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ color: "#f5f0ff", fontSize: 14 }}>Loading...</div>
    </div>
  );

  const isComplete = status?.connected && status?.onboardingComplete;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 20, padding: 28, maxWidth: 480, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffd700" }}>💰 Marketplace Payments</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {isComplete ? (
          <div>
            {/* Connected & Active */}
            <div style={{ padding: 16, background: "rgba(78,205,196,0.08)", borderRadius: 12, marginBottom: 16, borderLeft: "3px solid #4ecdc4" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4ecdc4", marginBottom: 4 }}>✓ Connected to Stripe</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                You can receive payments for bookings. Muse charges a 5% marketplace fee on transactions.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: status?.chargesEnabled ? "#4ecdc4" : "#ff6b6b" }}>
                  {status?.chargesEnabled ? "✓" : "✗"}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Charges Enabled</div>
              </div>
              <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: status?.payoutsEnabled ? "#4ecdc4" : "#ff6b6b" }}>
                  {status?.payoutsEnabled ? "✓" : "✗"}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Payouts Enabled</div>
              </div>
            </div>

            <div style={{ padding: 12, background: "rgba(255,215,0,0.06)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
              <strong style={{ color: "#ffd700" }}>How it works:</strong><br/>
              • Clients pay you through Muse bookings<br/>
              • Muse takes 5% marketplace fee<br/>
              • You receive 95% via Stripe payouts<br/>
              • Funds arrive in 2-7 business days
            </div>
          </div>
        ) : (
          <div>
            {/* Not connected */}
            <div style={{ padding: 16, background: "rgba(255,215,0,0.06)", borderRadius: 12, marginBottom: 16, borderLeft: "3px solid #ffd700" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd700", marginBottom: 4 }}>
                {status?.connected ? "⚠️ Onboarding Incomplete" : "Not Connected"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                {status?.connected
                  ? "Your Stripe account needs additional information to start receiving payments."
                  : "Connect your Stripe account to receive payments for bookings and collaborations."
                }
              </div>
            </div>

            <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
              <strong style={{ color: "#f5f0ff" }}>What you need:</strong><br/>
              • Full legal name<br/>
              • Email address<br/>
              • Bank account for payouts<br/>
              • Tax information (W-9 for US)
            </div>

            <button onClick={startOnboarding} disabled={connecting} style={{
              width: "100%", padding: "14px 24px", borderRadius: 12,
              background: connecting ? "rgba(255,215,0,0.3)" : "linear-gradient(135deg, #ffd700, #ff8c00)",
              border: "none", color: "#0a0612", fontSize: 14, fontWeight: 700, cursor: connecting ? "default" : "pointer",
            }}>
              {connecting ? "Connecting..." : status?.connected ? "Complete Onboarding" : "Connect with Stripe"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
