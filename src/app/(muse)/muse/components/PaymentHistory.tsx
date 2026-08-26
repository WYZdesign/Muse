"use client";

import { useState, useEffect } from "react";
import { getAccessToken, authFetch } from "../lib/auth-client";

type Payment = {
  id: string;
  amount_cents: number;
  commission_cents: number;
  net_amount_cents: number;
  status: string;
  created_at: string;
  payer_id?: { name: string; avatar: string };
  payee_id?: { name: string; avatar: string };
  booking_id?: { session_id: string; status: string };
};

type Props = {
  userId: string;
  onClose: () => void;
};

export default function PaymentHistory({ userId, onClose }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"received" | "sent">("received");

  useEffect(() => {
    // Fetch payments from booking_payments table
    let cancelled = false;
    authFetch("/api/muse", {
      method: "POST",
      body: JSON.stringify({ type: "get-payments" }),
    }).then(r => r.json()).then(d => {
      if (cancelled) return;
      setPayments(d.payments || []);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const received = payments.filter(p => p.payee_id && (p.payee_id as any).id === userId || (typeof p.payee_id === "string" && p.payee_id === userId));
  const sent = payments.filter(p => p.payer_id && (p.payer_id as any).id === userId || (typeof p.payer_id === "string" && p.payer_id === userId));

  const activeList = tab === "received" ? received : sent;
  const totalReceived = received.filter(p => p.status === "succeeded").reduce((s, p) => s + p.net_amount_cents, 0);
  const totalSent = sent.filter(p => p.status === "succeeded").reduce((s, p) => s + p.amount_cents, 0);
  const totalCommission = received.filter(p => p.status === "succeeded").reduce((s, p) => s + p.commission_cents, 0);

  const statusColor = (s: string) => {
    if (s === "succeeded") return "#4ecdc4";
    if (s === "pending") return "#ffd700";
    if (s === "failed" || s === "refunded") return "#ff6b6b";
    return "rgba(255,255,255,0.5)";
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 20, padding: 28, maxWidth: 520, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffd700" }}>💰 Payment History</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={{ padding: 12, background: "rgba(78,205,196,0.08)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#4ecdc4" }}>{fmt(totalReceived)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Received (net)</div>
          </div>
          <div style={{ padding: 12, background: "rgba(255,107,107,0.08)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#ff6b6b" }}>{fmt(totalCommission)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Muse Fee (5%)</div>
          </div>
          <div style={{ padding: 12, background: "rgba(255,215,0,0.08)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#ffd700" }}>{fmt(totalSent)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Total Spent</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          <button onClick={() => setTab("received")} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: tab === "received" ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.04)", border: "none", color: tab === "received" ? "#4ecdc4" : "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Received ({received.length})
          </button>
          <button onClick={() => setTab("sent")} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: tab === "sent" ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.04)", border: "none", color: tab === "sent" ? "#ffd700" : "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Sent ({sent.length})
          </button>
        </div>

        {/* Payment list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.4)" }}>Loading...</div>
        ) : activeList.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.4)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
            <div>No {tab} payments yet</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Payments from bookings will appear here</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activeList.map(p => (
              <div key={p.id} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#f5f0ff" }}>
                      {tab === "received" ? fmt(p.net_amount_cents) : fmt(p.amount_cents)}
                    </span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${statusColor(p.status)}15`, color: statusColor(p.status) }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    {tab === "received" ? `From: ${(p.payer_id as any)?.name || "Client"}` : `To: ${(p.payee_id as any)?.name || "Creative"}`}
                    {" · "}{new Date(p.created_at).toLocaleDateString()}
                  </div>
                  {tab === "received" && p.commission_cents > 0 && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      Muse fee: {fmt(p.commission_cents)} (5%)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

