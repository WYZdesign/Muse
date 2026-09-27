"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/app/(muse)/muse/lib/api";

type RefundRequest = {
  id: string;
  user_id: { name?: string; avatar?: string } | null;
  booking_id: string | null;
  reason: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

const box: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 };

function money(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toFixed(2)}`;
}

export default function RefundsTab() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inFlight, setInFlight] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-refunds" }) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setError(e.error || `Couldn't load refunds (${r.status})`);
        if (!silent) setRefunds([]);
        return;
      }
      const d = await r.json();
      setRefunds(Array.isArray(d.refunds) ? d.refunds : []);
    } catch {
      setError("Couldn't load refunds — network error");
      if (!silent) setRefunds([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resolveRefund = async (id: string, decision: "refund" | "decline") => {
    setInFlight(id);
    setError("");
    try {
      const r = await authFetch("/api/muse", {
        method: "POST",
        body: JSON.stringify({ type: "admin-resolve-refund", requestId: id, resolve: decision, note: notes[id] || "" }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setError(e.error || `Couldn't ${decision === "refund" ? "approve" : "decline"} refund (${r.status})`);
        return;
      }
      setRefunds(prev => prev.filter(x => x.id !== id));
      setNotes(prev => { const next = { ...prev }; delete next[id]; return next; });
      void load(true);
    } catch {
      setError("Couldn't update refund — network error");
    } finally {
      setInFlight(null);
    }
  };

  if (loading) {
    return <div style={{ ...box, textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading refunds…</div>;
  }

  return (
    <div>
      {error && (
        <div role="alert" style={{ ...box, marginBottom: 12, borderColor: "rgba(255,80,80,0.4)", color: "#ff8a80", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span>{error}</span>
          <button type="button" onClick={() => void load()} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff8a80", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {refunds.length === 0 ? (
        <div style={{ ...box, textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
          <div>No pending refunds</div>
        </div>
      ) : refunds.map(r => (
        <div key={r.id} style={{ ...box, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#ffd700" }}>{money(r.amount_cents)}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f5f0ff", marginTop: 2 }}>{r.user_id?.name || "Unknown"}</div>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
            <strong>Session:</strong> {r.booking_id ? String(r.booking_id).slice(0, 8) + "…" : "—"}
          </div>
          {r.reason && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}><strong>Reason:</strong> {r.reason}</div>}
          <input
            aria-label={`Resolution note for ${r.user_id?.name || "refund request"}`}
            placeholder="Optional note for the decision"
            value={notes[r.id] || ""}
            onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
            maxLength={500}
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 12, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={inFlight === r.id}
              onClick={() => void resolveRefund(r.id, "refund")}
              style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(100,200,120,0.15)", border: "1px solid rgba(100,200,120,0.3)", color: "#7ee2a0", fontSize: 12, fontWeight: 700, cursor: inFlight === r.id ? "default" : "pointer", opacity: inFlight === r.id ? 0.5 : 1 }}
            >
              {inFlight === r.id ? "Working…" : "Approve refund"}
            </button>
            <button
              type="button"
              disabled={inFlight === r.id}
              onClick={() => void resolveRefund(r.id, "decline")}
              style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff8a80", fontSize: 12, fontWeight: 700, cursor: inFlight === r.id ? "default" : "pointer", opacity: inFlight === r.id ? 0.5 : 1 }}
            >
              {inFlight === r.id ? "Working…" : "Deny"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
