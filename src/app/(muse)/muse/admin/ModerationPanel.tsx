"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getAccessToken, authFetch } from "@/app/(muse)/muse/lib/api";

type Report = {
  id: string; reporter_id: { id: string; name: string; avatar: string } | null;
  target_id: { id: string; name: string; avatar: string } | null;
  reason: string; details: string; created_at: string;
};
type Strike = {
  id: string; user_id: { id: string; name: string; avatar: string } | null;
  reason: string; category: string; severity: string;
  suspension_ends_at: string | null; appeal_status: string;
  created_at: string;
};
type AuditLog = { id: string; query_text: string; query_result_summary: string; created_at: string };

export default function AdminModerationPanel() {
  const [tab, setTab] = useState<"reports" | "strikes" | "scans" | "brain" | "audit">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [scanRows, setScanRows] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [brainQuery, setBrainQuery] = useState("");
  const [brainResult, setBrainResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setToken(data.session?.access_token || "");
    })();
  }, []);

  const loadTab = async (t: string) => {
    setTab(t as any);
    if (t === "reports" && !reports.length) {
      const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-reports" }) });
      if (r.ok) { const d = await r.json(); setReports(d.reports || []); }
    }
    if (t === "strikes" && !strikes.length) {
      const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-strikes" }) });
      if (r.ok) { const d = await r.json(); setStrikes(d.strikes || []); }
    }
    if (t === "scans") {
      // Always refetch — the queue changes as uploads happen.
      const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-content-scans" }) });
      if (r.ok) { const d = await r.json(); setScanRows(d.scans || []); setIncidents(d.incidents || []); }
    }
    if (t === "audit") {
      const r = await authFetch("/api/muse?type=admin-analytics");
      if (r.ok) { const d = await r.json(); setAuditLog(d.auditLog || []); }
    }
  };

  const runBrainQuery = async () => {
    if (!brainQuery.trim()) return;
    setLoading(true);
    try {
      const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-brain", query: brainQuery }) });
      if (r.ok) {
        const d = await r.json();
        setBrainResult(d.answer || JSON.stringify(d.data || d, null, 2));
      } else {
        const e = await r.json();
        setBrainResult(`Error: ${e.error}`);
      }
    } finally { setLoading(false); }
  };

  const suspendUser = async (userId: string, reason: string, days: number | null) => {
    const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-suspend-user", targetUserId: userId, reason, durationDays: days }) });
    if (r.ok) {
      setStrikes(s => [...s, { id: "new", user_id: { id: userId, name: "", avatar: "" }, reason, category: "high_severity", severity: days ? "suspension" : "permanent_ban", suspension_ends_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null, appeal_status: "none", created_at: new Date().toISOString() }]);
    }
  };

  const [resolvingAppeal, setResolvingAppeal] = useState<string | null>(null);
  const [nsfwScanResult, setNsfwScanResult] = useState<string>("");
  const [nsfwScanning, setNsfwScanning] = useState(false);
  const resolveAppeal = async (strikeId: string, resolution: "upheld" | "overturned") => {
    setResolvingAppeal(strikeId);
    try {
      const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-resolve-appeal", strikeId, resolution }) });
      if (r.ok) {
        setStrikes(s => s.map(st => st.id === strikeId ? { ...st, appeal_status: resolution, ...(resolution === "overturned" ? { severity: "warning" } : {}) } : st));
      }
    } finally { setResolvingAppeal(null); }
  };

  const scanAllNsfw = async () => {
    setNsfwScanning(true);
    setNsfwScanResult("Scanning...");
    try {
      const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-scan-nsfw", all: true }) });
      if (r.ok) {
        const d = await r.json();
        setNsfwScanResult(`Done — scanned ${d.scanned}/${d.total} profiles, ${d.flagged} flagged as NSFW, ${d.errors} errors`);
      } else {
        const e = await r.json();
        setNsfwScanResult(`Error: ${e.error}`);
      }
    } catch { setNsfwScanResult("Scan failed — network error"); }
    finally { setNsfwScanning(false); }
  };

  const box: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0612", color: "#f5f0ff", padding: "32px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🛡️ Admin Moderation</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>Reports, strikes, user management, and AI admin brain.</p>

        {/* NSFW Batch Scan */}
        <div style={{ background: "rgba(255,69,0,0.08)", border: "1px solid rgba(255,69,0,0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#ff6b6b", marginBottom: 6 }}>NSFW Profile Scanner</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>Scan all non-NSFW profiles' avatars via Rekognition. Suggestive content auto-sets the profile's NSFW flag for age-gating in Discovery.</div>
          <button onClick={scanAllNsfw} disabled={nsfwScanning} style={{ padding: "8px 16px", borderRadius: 8, background: nsfwScanning ? "rgba(255,69,0,0.3)" : "rgba(255,69,0,0.15)", border: "1px solid rgba(255,69,0,0.3)", color: "#ff6b6b", fontSize: 13, fontWeight: 600, cursor: nsfwScanning ? "wait" : "pointer" }}>
            {nsfwScanning ? "Scanning..." : "Scan All Profiles"}
          </button>
          {nsfwScanResult && <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{nsfwScanResult}</div>}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4 }}>
          {[["reports", `Reports (${reports.length})`], ["strikes", `Strikes (${strikes.length})`], ["scans", `Scans${incidents.length ? ` ⚠${incidents.length}` : ""}`], ["brain", "🧠 AI Brain"], ["audit", "Audit Log"]].map(([key, label]) => (
            <button key={key} onClick={() => loadTab(key)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: tab === key ? "rgba(255,215,0,0.15)" : "transparent", border: "none", color: tab === key ? "#ffd700" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>

        {/* REPORTS */}
        {tab === "reports" && (
          <div>
            {reports.length === 0 ? (
              <div style={{ ...box, textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div>No reports yet</div>
              </div>
            ) : reports.map(r => (
              <div key={r.id} style={{ ...box, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ffd700" }}>{r.reporter_id?.name || "Unknown"}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 8px" }}>reported</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ff6b6b" }}>{r.target_id?.name || "Unknown"}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: "#f5f0ff", marginBottom: 4 }}><strong>Reason:</strong> {r.reason}</div>
                {r.details && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>{r.details}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => suspendUser(r.target_id?.id || "", `Reported: ${r.reason}`, 7)} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,150,0,0.15)", border: "1px solid rgba(255,150,0,0.3)", color: "#ff9600", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Suspend 7d</button>
                  <button onClick={() => suspendUser(r.target_id?.id || "", `Reported: ${r.reason}`, 30)} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,100,0,0.15)", border: "1px solid rgba(255,100,0,0.3)", color: "#ff6400", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Suspend 30d</button>
                  <button onClick={() => suspendUser(r.target_id?.id || "", `Reported: ${r.reason} — permanent ban`, null)} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.3)", color: "#ff3232", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Ban</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SCANS — upload moderation queue (videos land here as pending_review) */}
        {tab === "scans" && (
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Pending incidents first, then the 100 most recent moderation scans.</div>
            {incidents.length === 0 && scanRows.length === 0 && (
              <div style={{ ...box, textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
                <div>No scans or pending incidents</div>
              </div>
            )}
            {incidents.map(i => (
              <div key={i.id} style={{ ...box, marginBottom: 10, borderColor: i.severity === "critical" ? "rgba(255,50,50,0.5)" : "rgba(255,150,0,0.35)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: i.severity === "critical" ? "#ff3232" : "#ff9600" }}>
                    {i.type === "csam" ? "🚨 CSAM" : "⚠️"} {i.type}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(i.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                  status: {i.status}{i.details?.flaggedCategories?.length ? ` · flagged: ${i.details.flaggedCategories.join(", ")}` : ""}{i.user_id ? ` · user ${String(i.user_id).slice(0, 8)}…` : ""}
                </div>
                {i.status === "pending_review" && (
                  <button
                    onClick={async () => {
                      const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "admin-resolve-incident", incidentId: i.id }) });
                      if (r.ok) setIncidents(prev => prev.filter(x => x.id !== i.id));
                    }}
                    style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(100,200,120,0.15)", border: "1px solid rgba(100,200,120,0.3)", color: "#7ee2a0", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >Mark reviewed</button>
                )}
              </div>
            ))}
            {scanRows.filter(s => !s.safe || s.should_block || s.should_report || /video/i.test(String(s.file_type))).map(s => (
              <div key={s.id} style={{ ...box, marginBottom: 8, opacity: s.safe ? 0.65 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.is_csam ? "#ff3232" : s.safe ? "rgba(255,255,255,0.6)" : "#ff9600" }}>
                    {s.is_csam ? "🚨 CSAM · " : !s.safe ? "⚠ FLAGGED · " : "🎬 "}{s.file_name || "(unnamed)"}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{new Date(s.scanned_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                  ctx: {s.context || "?"} · type: {s.file_type || "?"}{s.confidence != null ? ` · conf ${(s.confidence * 100).toFixed(0)}%` : ""}{s.flagged_categories?.length ? ` · [${s.flagged_categories.join(", ")}]` : ""}{s.user_id ? ` · user ${String(s.user_id).slice(0, 8)}…` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STRIKES */}
        {tab === "strikes" && (
          <div>
            {strikes.length === 0 ? (
              <div style={{ ...box, textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                <div>No strikes issued</div>
              </div>
            ) : strikes.map(s => (
              <div key={s.id} style={{ ...box, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.severity === "permanent_ban" ? "#ff3232" : s.severity === "suspension" ? "#ff9600" : "#ffd700" }}>{s.user_id?.name || "Unknown"}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: s.category === "high_severity" ? "rgba(255,50,50,0.2)" : "rgba(255,200,0,0.15)", color: s.category === "high_severity" ? "#ff6b6b" : "#ffd700", marginLeft: 8 }}>{s.category}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(s.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: "#f5f0ff", marginBottom: 4 }}><strong>Reason:</strong> {s.reason}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                  Severity: {s.severity} {s.suspension_ends_at ? `— until ${new Date(s.suspension_ends_at).toLocaleDateString()}` : ""}
                  {s.appeal_status !== "none" ? ` — Appeal: ${s.appeal_status}` : ""}
                </div>
                {s.appeal_status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button disabled={resolvingAppeal === s.id} onClick={() => resolveAppeal(s.id, "overturned")} style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8, background: "rgba(120,255,150,0.12)", border: "1px solid rgba(120,255,150,0.3)", color: "#78ff96", cursor: resolvingAppeal === s.id ? "default" : "pointer", opacity: resolvingAppeal === s.id ? 0.5 : 1 }}>Overturn (downgrade to warning)</button>
                    <button disabled={resolvingAppeal === s.id} onClick={() => resolveAppeal(s.id, "upheld")} style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8, background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff6b6b", cursor: resolvingAppeal === s.id ? "default" : "pointer", opacity: resolvingAppeal === s.id ? 0.5 : 1 }}>Uphold Strike</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI ADMIN BRAIN */}
        {tab === "brain" && (
          <div>
            <div style={{ ...box, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ffd700", marginBottom: 8 }}>🧠 Ask Your Data</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                Ask natural-language questions about your platform. Read-only — no data is modified.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={brainQuery} onChange={e => setBrainQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runBrainQuery()} placeholder="e.g. How many users do we have? Who has the most reports?" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f0ff", fontSize: 13 }} />
                <button onClick={runBrainQuery} disabled={loading || !brainQuery.trim()} style={{ padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {loading ? "..." : "Ask"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {["How many users?", "Show reports", "Active users this week", "Strike count", "Disclosures status", "Safety check-ins"].map(q => (
                  <button key={q} onClick={() => { setBrainQuery(q); }} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer" }}>{q}</button>
                ))}
              </div>
            </div>

            {brainResult && (
              <div style={{ ...box }}>
                <div style={{ fontSize: 12, color: "#ffd700", fontWeight: 700, marginBottom: 6 }}>Result:</div>
                <div style={{ fontSize: 13, color: "#f5f0ff", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{brainResult}</div>
              </div>
            )}
          </div>
        )}

        {/* AUDIT LOG */}
        {tab === "audit" && (
          <div>
            <div style={{ ...box, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                Every admin AI query is logged here for your legal protection and audit trail.
              </p>
            </div>
            {auditLog.length === 0 ? (
              <div style={{ ...box, textAlign: "center", padding: 30, color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                <div>No audit entries yet — use the AI Brain tab to generate queries</div>
              </div>
            ) : auditLog.map(l => (
              <div key={l.id} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
                <span style={{ color: "#ffd700" }}>{l.query_text}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 12 }}>{new Date(l.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
