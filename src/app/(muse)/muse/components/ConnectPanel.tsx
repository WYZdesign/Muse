"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../lib/auth-client";
import EmbeddedConnect from "./EmbeddedConnect";
import LoadingOverlay from "./LoadingOverlay";

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

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export default function ConnectPanel({ onClose }: Props) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [embedded, setEmbedded] = useState(false);

  const refresh = useCallback(async () => {
    if (DEMO_MODE) {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const r = await authFetch("/api/muse/connect", {
        method: "POST",
        body: JSON.stringify({ action: "account-status" }),
      });
      const d = await r.json();
      setStatus(d);
    } catch {
      /* leave previous status */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startOnboarding = async () => {
    if (DEMO_MODE) return;
    // Embedded ConnectJS flow — custom-styled in-app, no redirect.
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setEmbedded(true);
      return;
    }

    // Fallback: hosted redirect (only when the publishable key isn't configured).
    setConnecting(true);
    try {
      const r = await authFetch("/api/muse/connect", {
        method: "POST",
        body: JSON.stringify({ action: "create-account" }),
      });
      const d = await r.json();
      if (d.url) {
        window.location.href = d.url;
      } else if (d.onboardingUrl) {
        window.location.href = d.onboardingUrl;
      } else if (d.onboardingComplete) {
        setStatus({ connected: true, chargesEnabled: d.chargesEnabled, payoutsEnabled: d.payoutsEnabled, onboardingComplete: true });
      } else if (d.error) {
        alert(d.error + (d.status === 503 ? " — Stripe may not be configured yet" : ""));
      } else {
        alert("Unexpected response — try again");
      }
    } catch (e: any) { alert("Could not start onboarding — " + (e?.message || "try again")); }
    setConnecting(false);
  };

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,3,10,0.85)" }}>
      <div style={{ color: "var(--text)", fontSize: 14 }}>Loading...</div>
    </div>
  );

  const isComplete = status?.connected && status?.onboardingComplete;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)" }}>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--gold)", borderRadius: 20, padding: 28, maxWidth: 480, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>💰 Marketplace Payments</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {connecting && <LoadingOverlay message="Redirecting to Stripe…" />}

        {DEMO_MODE && (
          <div style={{ padding: 12, marginBottom: 16, borderRadius: 10, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.28)", fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--gold)" }}>Demo preview</strong><br />
            Stripe onboarding and payout details are unavailable here. No account, bank, tax, or payment information is collected.
          </div>
        )}

        {DEMO_MODE ? (
          <div style={{ padding: 16, background: "var(--surface)", borderRadius: 12, fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
            Payment onboarding is disabled for this demo. Use a non-demo staging environment with Stripe test credentials to verify the real payout flow.
          </div>
        ) : embedded ? (
          <EmbeddedConnect
            onExit={async () => {
              setEmbedded(false);
              setLoading(true);
              await refresh();
            }}
          />
        ) : isComplete ? (
          <div>
            {/* Connected & Active */}
            <div style={{ padding: 16, background: "rgba(78,205,196,0.08)", borderRadius: 12, marginBottom: 16, borderLeft: "3px solid #4ecdc4" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4ecdc4", marginBottom: 4 }}>✓ Connected to Stripe</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>
                You can receive payments for bookings. Muse takes a 7% host commission on each booking.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div style={{ padding: 12, background: "var(--surface)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: status?.chargesEnabled ? "#4ecdc4" : "#ff6b6b" }}>
                  {status?.chargesEnabled ? "✓" : "✗"}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Charges Enabled</div>
              </div>
              <div style={{ padding: 12, background: "var(--surface)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: status?.payoutsEnabled ? "#4ecdc4" : "#ff6b6b" }}>
                  {status?.payoutsEnabled ? "✓" : "✗"}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Payouts Enabled</div>
              </div>
            </div>

            <div style={{ padding: 12, background: "rgba(255,215,0,0.06)", borderRadius: 10, fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--gold)" }}>How it works:</strong><br/>
              • Clients pay you through Muse bookings<br/>
              • Muse takes a 7% host commission (clients also pay an 8% service fee)<br/>
              • You receive 93% via Stripe payouts<br/>
              • Funds arrive in 2-7 business days
            </div>
          </div>
        ) : (
          <div>
            {/* Not connected */}
            <div style={{ padding: 16, background: "rgba(255,215,0,0.06)", borderRadius: 12, marginBottom: 16, borderLeft: "3px solid #ffd700" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 4 }}>
                {status?.connected ? "⚠️ Onboarding Incomplete" : "Not Connected"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>
                {status?.connected
                  ? "Your Stripe account needs additional information to start receiving payments."
                  : "Connect your Stripe account to receive payments for bookings and collaborations."
                }
              </div>
            </div>

            <div style={{ padding: 12, background: "var(--surface)", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text)" }}>What you need:</strong><br/>
              • Full legal name<br/>
              • Email address<br/>
              • Bank account for payouts<br/>
              • Tax information (W-9 for US)
            </div>

            <button onClick={startOnboarding} disabled={connecting || DEMO_MODE} title={DEMO_MODE ? "Stripe onboarding is unavailable in this demo" : undefined} style={{
              width: "100%", padding: "14px 24px", borderRadius: 12,
              background: connecting || DEMO_MODE ? "rgba(255,215,0,0.3)" : "linear-gradient(135deg, var(--gold), var(--amber))",
              border: "none", color: "var(--bg)", fontSize: 14, fontWeight: 700, cursor: connecting || DEMO_MODE ? "not-allowed" : "pointer",
            }}>
              {DEMO_MODE ? "Stripe unavailable in demo" : connecting ? "Connecting..." : status?.connected ? "Complete Onboarding" : "Connect with Stripe"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
