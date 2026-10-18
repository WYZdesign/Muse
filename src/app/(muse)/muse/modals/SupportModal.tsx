/** Human support ticket modal: submits a request and lists the member's own tickets, with Studio requests created as priority. */
"use client";

import { useEffect, useState } from "react";
import { isStudioTier } from "../components/subscriptionTiers";

type SupportTicket = {
  id: string;
  subject: string;
  status?: string;
  priority?: string;
  created_at?: string;
};

export interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  showToast: (msg: string) => void;
  userTier?: string;
}

export function SupportModal({ open, onClose, apiFetch, showToast, userTier }: SupportModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "support-tickets-get" }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && Array.isArray(d.tickets)) setTickets(d.tickets); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, apiFetch]);

  if (!open) return null;

  const isStudio = isStudioTier(userTier);

  const submit = async () => {
    if (!subject.trim() || !body.trim() || busy) return;
    setBusy(true);
    try {
      const r = await apiFetch("/api/muse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "support-ticket-create", subject: subject.trim(), body: body.trim() }),
      });
      const d = await r.json().catch(() => ({} as { error?: string; priority?: string }));
      if (!r.ok) { showToast(d.error || "Couldn't send that request"); return; }
      showToast(d.priority === "high" ? "Sent. Studio requests are prioritized." : "Sent. We'll reply by email.");
      setSubject("");
      setBody("");
      const refreshed = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "support-tickets-get" }) });
      if (refreshed.ok) {
        const nd = await refreshed.json();
        if (Array.isArray(nd.tickets)) setTickets(nd.tickets);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} role="presentation" onClick={onClose}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <div role="dialog" aria-modal="true" aria-label="Contact support" onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxWidth: 460, maxHeight: "86vh", overflowY: "auto", background: "linear-gradient(135deg,#0d0520,#1a0a2e,#0d0520)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Contact support</h2>
          <button type="button" onClick={onClose} aria-label="Close support" style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
          {isStudio ? "Musa Studio requests are flagged priority and sorted first in the queue." : "We reply by email. Musa Studio requests are prioritized."}
        </p>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Support subject" maxLength={120}
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", fontSize: 13, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--text)", marginBottom: 8 }} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do you need help with?" aria-label="Support message" maxLength={4000} rows={5}
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", fontSize: 13, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--text)", resize: "vertical", marginBottom: 10 }} />
        <button type="button" onClick={submit} disabled={busy || !subject.trim() || !body.trim()}
          style={{ width: "100%", padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 10, border: "none", cursor: busy || !subject.trim() || !body.trim() ? "default" : "pointer", background: subject.trim() && body.trim() ? "linear-gradient(135deg,var(--gold),var(--amber))" : "rgba(255,255,255,0.08)", color: subject.trim() && body.trim() ? "#0a0612" : "var(--muted)" }}>
          {busy ? "Sending..." : "Send request"}
        </button>
        {tickets.length > 0 && (
          <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 8 }}>Your requests</div>
            {tickets.slice(0, 8).map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, color: "var(--muted)", padding: "7px 0" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                <span style={{ flexShrink: 0, color: t.status === "open" ? (t.priority === "high" ? "var(--gold)" : "var(--text2)") : "var(--muted)" }}>
                  {t.status === "open" ? (t.priority === "high" ? "Priority" : "Open") : "Resolved"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
