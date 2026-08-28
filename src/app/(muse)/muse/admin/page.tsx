"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/app/(muse)/muse/lib/api";

type AnalyticsData = {
  totals: { users: number; matches: number; albums: number };
  signupsByDay: Record<string, number>;
  retention: { activeLastWeek: number; activePriorWeek: number; retainedCount: number; retentionRatePct: number | null };
  featureUsage: Record<string, number>;
  recentEvents: { name: string; props: Record<string, unknown>; created_at: string }[];
  referrals?: { total: number; signedUp: number; rewarded: number };
  payments?: { total: number; succeeded: number; totalVolume: number; totalCommission: number };
  connectedAccounts?: number;
};

/**
 * Real admin analytics dashboard — reads live aggregated data from Supabase
 * via GET /api/muse?type=admin-analytics (server-side enforces ADMIN_EMAILS
 * allowlist regardless of anything checked here). No LLM/chat interface:
 * there's no AI API key configured in this project's environment, so an
 * "ask your data questions" assistant isn't something that can honestly be
 * built right now. This shows the real numbers instead.
 */
export default function AdminDashboard() {
  const [status, setStatus] = useState<"loading" | "unauthenticated" | "forbidden" | "ready" | "error">("loading");
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { if (!cancelled) setStatus("unauthenticated"); return; }
      try {
        const r = await authFetch("/api/muse?type=admin-analytics");
        if (r.status === 403) { if (!cancelled) setStatus("forbidden"); return; }
        if (!r.ok) { if (!cancelled) setStatus("error"); return; }
        const j = await r.json();
        if (!cancelled) { setData(j); setStatus("ready"); }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const box: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 };
  const label: React.CSSProperties = { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
  const bigNum: React.CSSProperties = { fontSize: 32, fontWeight: 800, color: "#ffd700" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0612", color: "#f5f0ff", padding: "32px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <a href="/muse" style={{ color: "rgba(255,255,255,0.5)", fontSize: 22, textDecoration: "none", padding: "4px 8px", borderRadius: 8, transition: "all .2s" }}>←</a>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 0 }}>Muse — Admin Dashboard</h1>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>Platform overview and community health metrics.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <a href="/muse/admin/moderation" style={{ display: "inline-block", padding: "8px 16px", borderRadius: 10, background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "#ffd700", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🛡️ Moderation</a>
          <a href="/muse" style={{ display: "inline-block", padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🏠 Back to Muse</a>
        </div>

        {status === "loading" && <p style={{ color: "rgba(255,255,255,0.6)" }}>Loading…</p>}
        {status === "unauthenticated" && (
          <div style={box}>
            <p>You need to be signed in as an admin to view this page.</p>
            <a href="/muse" style={{ color: "#ffd700" }}>Go to Muse and sign in →</a>
          </div>
        )}
        {status === "forbidden" && (
          <div style={box}>
            <p>Your account doesn't have admin access yet. Contact the team to get set up.</p>
          </div>
        )}
        {status === "error" && (
          <div style={box}>
            <p>Something went wrong loading the dashboard. Please try again.</p>
          </div>
        )}

        {status === "ready" && data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={box}><div style={label}>Community Members</div><div style={bigNum}>{data.totals.users}</div></div>
              <div style={box}><div style={label}>Connections Made</div><div style={bigNum}>{data.totals.matches}</div></div>
              <div style={box}><div style={label}>Shared Albums</div><div style={bigNum}>{data.totals.albums}</div></div>
              <div style={box}>
                <div style={label}>Weekly Return Rate</div>
                <div style={bigNum}>{data.retention.retentionRatePct !== null ? `${data.retention.retentionRatePct}%` : "—"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  {data.retention.retainedCount} of {data.retention.activePriorWeek} returned this week
                </div>
              </div>
            </div>

            {data.referrals && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={{ ...box, borderLeft: "3px solid #4ecdc4" }}>                <div style={label}>Invite Program</div><div style={{ ...bigNum, color: "#4ecdc4" }}>{data.referrals.total}</div></div>
                <div style={{ ...box, borderLeft: "3px solid #ffd700" }}>                <div style={label}>Joined via Invite</div><div style={{ ...bigNum, color: "#ffd700" }}>{data.referrals.signedUp}</div></div>
                <div style={{ ...box, borderLeft: "3px solid #ff69b4" }}>                <div style={label}>Rewards Given</div><div style={{ ...bigNum, color: "#ff69b4" }}>{data.referrals.rewarded}</div></div>
              </div>
            )}

            {data.payments && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={{ ...box, borderLeft: "3px solid #98FB98" }}><div style={label}>Total Payments</div><div style={{ ...bigNum, color: "#98FB98" }}>{data.payments.total}</div></div>
                <div style={{ ...box, borderLeft: "3px solid #4ecdc4" }}><div style={label}>Volume</div><div style={{ ...bigNum, color: "#4ecdc4" }}>${(data.payments.totalVolume / 100).toFixed(0)}</div></div>
                <div style={{ ...box, borderLeft: "3px solid #FFD700" }}><div style={label}>Commission (5%)</div><div style={{ ...bigNum, color: "#FFD700" }}>${(data.payments.totalCommission / 100).toFixed(0)}</div></div>
                <div style={{ ...box, borderLeft: "3px solid #E1BEE7" }}><div style={label}>Connected Accounts</div><div style={{ ...bigNum, color: "#E1BEE7" }}>{data.connectedAccounts || 0}</div></div>
              </div>
            )}

            <div style={{ ...box, marginBottom: 24 }}>
              <div style={label}>Signups — last 30 days</div>
              {Object.keys(data.signupsByDay).length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>No signups in this window yet.</p>
              ) : (
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80, marginTop: 10 }}>
                  {Object.entries(data.signupsByDay).sort().map(([day, count]) => {
                    const max = Math.max(...Object.values(data.signupsByDay), 1);
                    return (
                      <div key={day} title={`${day}: ${count}`} style={{ flex: 1, background: "#ffd700", opacity: 0.7, height: `${Math.max(4, (count / max) * 100)}%`, borderRadius: 2 }} />
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ ...box, marginBottom: 24 }}>
              <div style={label}>Creator Activity — last 30 days</div>
              {Object.keys(data.featureUsage).length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  Activity data will appear here as creators use the app.
                </p>
              ) : (
                <div>
                  {Object.entries(data.featureUsage).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                      <span>{name}</span>
                      <span style={{ color: "#ffd700", fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={box}>
              <div style={label}>Recent Events</div>
              {data.recentEvents.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>No events yet.</p>
              ) : (
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {data.recentEvents.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" }}>
                      <span style={{ color: "#ffd700" }}>{e.name}</span>{" "}
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>{new Date(e.created_at).toLocaleString()}</span>
                      {e.props && Object.keys(e.props).length > 0 && (
                        <span style={{ color: "rgba(255,255,255,0.4)" }}> — {JSON.stringify(e.props)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
