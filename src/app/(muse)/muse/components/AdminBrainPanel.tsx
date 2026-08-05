"use client";

import { useState } from "react";
import { authFetch } from "../lib/auth-client";

type BrainResult = {
  answer: string;
  data?: unknown;
  sql?: string;
  error?: string;
};

export default function AdminBrainPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<BrainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ query: string; result: BrainResult; timestamp: string }[]>([]);

  const runQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/muse", {
        method: "POST",
        body: JSON.stringify({ type: "admin-brain", query: query.trim() }),
      });
      const data = await res.json();
      const resultData: BrainResult = res.ok ? data : { error: data.error || "Query failed", answer: "" };
      setResult(resultData);
      setHistory(prev => [{ query: query.trim(), result: resultData, timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
    } catch (e: unknown) {
      setResult({ error: e instanceof Error ? e.message : "Network error", answer: "" });
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "How many active users in the last 7 days?",
    "Show me the top 5 users by match count",
    "What's the average match rate by creative type?",
    "List all bookings in the last 30 days with status breakdown",
    "Show me users with high severity strikes",
    "Which communities have the most members?",
    "What's the revenue from marketplace commissions this month?",
    "Show me the disclosure block rate and reasons",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0612", color: "#f5f0ff", padding: "32px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#ffd700", fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>Admin Brain</h1>
          <span style={{ fontSize: 12, color: "#98FB98", background: "rgba(152,251,152,0.1)", padding: "4px 12px", borderRadius: 99 }}>Read-only • Audit logged</span>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,215,0,0.1)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Ask anything about your data. Runs via Supabase with service role. Results are logged for audit.</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), runQuery())}
              placeholder="e.g. How many active users this week?"
              style={{ flex: 1, minWidth: 300, padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#0a0612", color: "#f5f0ff", fontSize: 14 }}
            />
            <button onClick={runQuery} disabled={loading || !query.trim()} style={{ padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg,#ffd700,#ffbf00)", color: "#0a0612", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Thinking..." : "Ask"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {exampleQueries.map((q, i) => (
              <button key={i} onClick={() => { setQuery(q); runQuery(); }} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)", color: "var(--muted)", cursor: "pointer", transition: "all .2s" }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: result.error ? "#ff6b6b" : "#4ecdc4" }}>
                {result.error ? "Error" : "Result"}
              </span>
              <button onClick={() => { setResult(null); setQuery(""); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>Clear</button>
            </div>
            {result.sql && (
              <div style={{ marginBottom: 16, padding: 12, background: "#0a0612", borderRadius: 8, border: "1px solid rgba(255,215,0,0.1)", fontSize: 11, fontFamily: "monospace", color: "#ffd700", overflowX: "auto" }}>
                {result.sql}
              </div>
            )}
            <pre style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", color: result.error ? "#ffb5b5" : "#e8e8e8" }}>
              {result.answer || JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}

        {history.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffd700", marginBottom: 16 }}>Query History (audit log)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((h, i) => (
                <div key={i} style={{ padding: "12px", background: "#0a0612", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{new Date(h.timestamp).toLocaleString()}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f5f0ff" }}>{h.query}</div>
                  <div style={{ fontSize: 11, color: h.result.error ? "#ffb5b5" : "#98FB98", marginTop: 4 }}>
                    {h.result.error ? `Error: ${h.result.error}` : "Success"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}