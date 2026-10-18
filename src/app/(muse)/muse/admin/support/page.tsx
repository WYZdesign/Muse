/** Admin support queue: lists member tickets with Musa Studio requests ordered first. */
"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/app/(muse)/muse/lib/api";

type Ticket = {
  id: string;
  user_id?: { id?: string; name?: string; email?: string } | string;
  subject: string;
  body: string;
  status?: string;
  priority?: string;
  created_at?: string;
  resolved_at?: string | null;
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await authFetch("/api/muse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin-support-tickets" }),
      });
      if (r.status === 403) { setState("forbidden"); return; }
      if (!r.ok) { setState("error"); return; }
      const d = await r.json();
      setTickets(Array.isArray(d.tickets) ? d.tickets : []);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try {
      const r = await authFetch("/api/muse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin-resolve-support-ticket", ticketId: id }),
      });
      if (r.ok) {
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: "resolved" } : t)));
      }
    } finally {
      setBusy(null);
    }
  };

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "96px 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text, #fff)", margin: 0 }}>Support queue</h1>
        <a href="/muse/admin" style={{ color: "#ffd700", fontSize: 13, textDecoration: "none" }}>&larr; Admin</a>
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 20px" }}>
        Musa Studio requests are created as priority and sort first. {openCount} open.
      </p>

      {state === "loading" && <p style={{ color: "rgba(255,255,255,0.6)" }}>Loading…</p>}
      {state === "forbidden" && <p style={{ color: "rgba(255,255,255,0.6)" }}>You need to be signed in as an admin to view this page.</p>}
      {state === "error" && <p style={{ color: "#ff6b6b" }}>Could not load the queue.</p>}
      {state === "ready" && tickets.length === 0 && <p style={{ color: "rgba(255,255,255,0.6)" }}>No tickets yet.</p>}

      {state === "ready" && tickets.map((t) => {
        const resolved = t.status !== "open";
        const high = t.priority === "high";
        const submitter = typeof t.user_id === "object" && t.user_id ? t.user_id : null;
        return (
          <div key={t.id} style={{ border: "1px solid " + (high && !resolved ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.08)"), background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, marginBottom: 12, opacity: resolved ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <strong style={{ fontSize: 14, color: "var(--text, #fff)" }}>{t.subject}</strong>
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 9px", color: high ? "#0a0612" : "rgba(255,255,255,0.8)", background: high ? "#ffd700" : "rgba(255,255,255,0.1)" }}>
                {resolved ? "Resolved" : high ? "Priority" : "Open"}
              </span>
            </div>
            {submitter && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                {submitter.name || "Unknown member"}{submitter.email ? <> &middot; <a href={`mailto:${submitter.email}`} style={{ color: "#ffd700", textDecoration: "none" }}>{submitter.email}</a></> : null}
              </div>
            )}
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap", marginBottom: 10 }}>{t.body}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
              </span>
              {!resolved && (
                <button type="button" disabled={busy === t.id} onClick={() => resolve(t.id)}
                  style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, borderRadius: 9, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: busy === t.id ? "default" : "pointer" }}>
                  {busy === t.id ? "Resolving..." : "Mark resolved"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
