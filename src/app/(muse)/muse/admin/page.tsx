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
  moderation?: { total: number; open: number; resolved: number; avgResolutionHours: number | null };
  refunds?: { total: number; open: number; approved: number; rejected: number };
  calls?: { total: number; answered: number; missed: number; voicemails: number };
  topCreators?: { id: string; name?: string; type?: string; activity: number }[];
  auditLog?: { id?: string; query_text?: string; action?: string; created_at?: string }[];
};

/**
 * Plain-English names for raw analytics keys, so nobody has to guess what
 * "swipe" or "ob_complete" means. Anything not listed falls back to a
 * humanised version of the key (snake_case / camelCase -> "Title Case").
 */
const FRIENDLY: Record<string, string> = {
  swipe: "Browsed profiles (swipe)",
  first_swipe: "Made their first swipe",
  like_profile: "Liked a profile",
  like: "Liked a profile",
  super_like: "Super-liked a profile",
  pass: "Passed on a profile",
  match: "Made a new connection",
  discover_match: "Made a new connection",
  unmatch: "Removed a connection",
  signup: "Created an account",
  login: "Signed in",
  logout: "Signed out",
  view_profile: "Viewed someone's profile",
  profile_view: "Viewed someone's profile",
  message: "Sent a message",
  message_sent: "Sent a message",
  post: "Posted to the feed",
  feed_post: "Posted to the feed",
  like_post: "Liked a post",
  comment: "Commented on a post",
  moment: "Posted a moment",
  booking: "Booked a session",
  booking_created: "Booked a session",
  session_create: "Listed a new session",
  album_create: "Created a portfolio album",
  album_view: "Viewed a portfolio album",
  boost: "Boosted their profile",
  quest: "Completed a quest",
  quest_complete: "Completed a quest",
  referral: "Invited a friend",
  checkout: "Started checkout",
  subscribe: "Subscribed to Muses Pro",
  onboarding: "Finished onboarding",
  onboarding_complete: "Finished onboarding",
  qr_scan: "Scanned a QR code",
  share: "Shared their link",
};

function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** "swipe" -> "Browsed profiles (swipe)" */
function friendly(name: string): string {
  return FRIENDLY[name] || titleCase(name);
}

/** Readable one-line summary of an event's props. */
function propsText(props: Record<string, unknown>): string {
  return Object.entries(props || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 4)
    .map(([k, v]) => `${titleCase(k)}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("  ·  ");
}

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
  const hint: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 1.5 };
  const groupTitle: React.CSSProperties = { fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#d4a5ff", margin: "4px 0 12px" };
  const navBtn = (bg: string, bd: string, fg: string): React.CSSProperties => ({ display: "inline-block", padding: "8px 16px", borderRadius: 10, background: bg, border: `1px solid ${bd}`, color: fg, fontSize: 13, fontWeight: 600, textDecoration: "none" });

  const signupDays = Object.keys(data?.signupsByDay || {});
  const signupsLast7 = signupDays
    .filter((d) => (Date.now() - new Date(d).getTime()) / 86_400_000 <= 7)
    .reduce((n, d) => n + (data!.signupsByDay[d] || 0), 0);
  const signupsLast30 = Object.values(data?.signupsByDay || {}).reduce((a, b) => a + b, 0);
  const topActivity = Object.entries(data?.featureUsage || {}).sort((a, b) => b[1] - a[1])[0];
  const inviteConversion = data?.referrals && data.referrals.total > 0
    ? Math.round((data.referrals.signedUp / data.referrals.total) * 100)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0612", color: "#f5f0ff", padding: "32px 24px 64px", fontFamily: "system-ui, sans-serif" }}>
      {/* Gradient title animation — self-contained so this route doesn't need muse.css. */}
      <style>{`
        @keyframes adminTitleFlow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .admin-title {
          background: linear-gradient(90deg,#FF4500,#FFD700,#FFAA00,#D4A5FF,#FF69B4,#FFD700,#FF4500);
          background-size: 300% 100%;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: adminTitleFlow 7s ease-in-out infinite;
        }
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* ── Header: centered title + centered sub-line ── */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 className="admin-title" style={{ fontSize: 38, fontWeight: 900, margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", letterSpacing: 2 }}>
            ADMIN PANEL
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 10, marginBottom: 0, textAlign: "center", lineHeight: 1.6 }}>
            Everything about Muse at a glance — who joined, what they&apos;re doing, how much money moved, and what needs your attention.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 28, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/muse/admin/moderation" style={navBtn("rgba(255,215,0,0.15)", "rgba(255,215,0,0.3)", "#ffd700")}>🛡️ Moderation</a>
          <a href="/muse" style={navBtn("rgba(255,255,255,0.06)", "rgba(255,255,255,0.1)", "rgba(255,255,255,0.7)")}>🏠 Back to Muses by WYZ</a>
        </div>

        {status === "loading" && <p style={{ color: "rgba(255,255,255,0.6)", textAlign: "center" }}>Loading…</p>}
        {status === "unauthenticated" && (
          <div style={box}>
            <p>You need to be signed in as an admin to view this page.</p>
            <a href="/muse" style={{ color: "#ffd700" }}>Go to Muse and sign in →</a>
          </div>
        )}
        {status === "forbidden" && (
          <div style={box}>
            <p>Your account doesn&apos;t have admin access yet. Contact the team to get set up.</p>
          </div>
        )}
        {status === "error" && (
          <div style={box}>
            <p>Something went wrong loading the dashboard. Please try again.</p>
          </div>
        )}

        {status === "ready" && data && (
          <>
            {/* ── THE BIG PICTURE ── */}
            <div style={groupTitle}>The big picture</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
              <div style={box}>
                <div style={label}>People on Muse</div>
                <div style={bigNum}>{data.totals.users}</div>
                <div style={hint}>Total accounts that exist</div>
              </div>
              <div style={box}>
                <div style={label}>Connections Made</div>
                <div style={bigNum}>{data.totals.matches}</div>
                <div style={hint}>Times two people liked each other back</div>
              </div>
              <div style={box}>
                <div style={label}>Portfolio Albums</div>
                <div style={bigNum}>{data.totals.albums}</div>
                <div style={hint}>Work collections creators have uploaded</div>
              </div>
              <div style={box}>
                <div style={label}>People Coming Back</div>
                <div style={bigNum}>{data.retention.retentionRatePct !== null ? `${data.retention.retentionRatePct}%` : "—"}</div>
                <div style={hint}>{data.retention.retainedCount} of {data.retention.activePriorWeek} returned this week</div>
              </div>
            </div>

            {/* ── GROWTH ── */}
            <div style={groupTitle}>Growth</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
              <div style={{ ...box, borderLeft: "3px solid #98FB98" }}>
                <div style={label}>New This Week</div>
                <div style={{ ...bigNum, color: "#98FB98" }}>{signupsLast7}</div>
                <div style={hint}>Accounts created in the last 7 days</div>
              </div>
              <div style={{ ...box, borderLeft: "3px solid #4ecdc4" }}>
                <div style={label}>New This Month</div>
                <div style={{ ...bigNum, color: "#4ecdc4" }}>{signupsLast30}</div>
                <div style={hint}>Accounts created in the last 30 days</div>
              </div>
              <div style={{ ...box, borderLeft: "3px solid #D4A5FF" }}>
                <div style={label}>Active People</div>
                <div style={{ ...bigNum, color: "#D4A5FF" }}>{data.retention.activeLastWeek}</div>
                <div style={hint}>Did something in the app this week</div>
              </div>
              <div style={{ ...box, borderLeft: "3px solid #FFD700" }}>
                <div style={label}>Most Popular Thing</div>
                <div style={{ ...bigNum, color: "#FFD700", fontSize: 20 }}>
                  {topActivity ? friendly(topActivity[0]) : "—"}
                </div>
                <div style={hint}>{topActivity ? `${topActivity[1]} times in 30 days` : "No activity recorded yet"}</div>
              </div>
            </div>

            {/* ── MONEY ── */}
            {data.payments && (
              <>
                <div style={groupTitle}>Money</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
                  <div style={{ ...box, borderLeft: "3px solid #98FB98" }}>
                    <div style={label}>Payments Attempted</div>
                    <div style={{ ...bigNum, color: "#98FB98" }}>{data.payments.total}</div>
                    <div style={hint}>How many checkouts were started</div>
                  </div>
                  <div style={{ ...box, borderLeft: "3px solid #4ecdc4" }}>
                    <div style={label}>Money In</div>
                    <div style={{ ...bigNum, color: "#4ecdc4" }}>${(data.payments.totalVolume / 100).toFixed(0)}</div>
                    <div style={hint}>Total charged through Muse</div>
                  </div>
                  <div style={{ ...box, borderLeft: "3px solid #FFD700" }}>
                    <div style={label}>Muse&apos;s Cut</div>
                    <div style={{ ...bigNum, color: "#FFD700" }}>${(data.payments.totalCommission / 100).toFixed(0)}</div>
                    <div style={hint}>Commission Muse earned</div>
                  </div>
                  <div style={{ ...box, borderLeft: "3px solid #E1BEE7" }}>
                    <div style={label}>Payout-Ready Creators</div>
                    <div style={{ ...bigNum, color: "#E1BEE7" }}>{data.connectedAccounts || 0}</div>
                    <div style={hint}>Finished Stripe setup, can get paid</div>
                  </div>
                </div>
              </>
            )}

            {/* ── INVITES ── */}
            {data.referrals && (
              <>
                <div style={groupTitle}>Invites &amp; Rewards</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
                  <div style={{ ...box, borderLeft: "3px solid #4ecdc4" }}>
                    <div style={label}>Invites Sent</div>
                    <div style={{ ...bigNum, color: "#4ecdc4" }}>{data.referrals.total}</div>
                    <div style={hint}>People who shared their invite link/code</div>
                  </div>
                  <div style={{ ...box, borderLeft: "3px solid #ffd700" }}>
                    <div style={label}>Joined Via Invite</div>
                    <div style={{ ...bigNum, color: "#ffd700" }}>{data.referrals.signedUp}</div>
                    <div style={hint}>Signed up using someone&apos;s invite</div>
                  </div>
                  <div style={{ ...box, borderLeft: "3px solid #ff69b4" }}>
                    <div style={label}>Rewards Given</div>
                    <div style={{ ...bigNum, color: "#ff69b4" }}>{data.referrals.rewarded}</div>
                    <div style={hint}>Free months actually handed out</div>
                  </div>
                  <div style={{ ...box, borderLeft: "3px solid #98FB98" }}>
                    <div style={label}>Invite Success Rate</div>
                    <div style={{ ...bigNum, color: "#98FB98" }}>{inviteConversion !== null ? `${inviteConversion}%` : "—"}</div>
                    <div style={hint}>Of invites sent, how many joined</div>
                  </div>
                </div>
              </>
            )}

            {/* ── SIGNUPS CHART ── */}
            <div style={{ ...box, marginBottom: 24 }}>
              <div style={label}>New Signups — last 30 days</div>
              <div style={{ ...hint, marginBottom: 8 }}>Each bar is one day. Taller bar = more people joined that day.</div>
              {signupDays.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>No signups in this window yet.</p>
              ) : (
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80, marginTop: 10 }}>
                  {Object.entries(data.signupsByDay).sort().map(([day, count]) => {
                    const max = Math.max(...Object.values(data.signupsByDay), 1);
                    return (
                      <div key={day} title={`${new Date(day).toLocaleDateString()} — ${count} signup${count === 1 ? "" : "s"}`}
                        style={{ flex: 1, background: "#ffd700", opacity: 0.7, height: `${Math.max(4, (count / max) * 100)}%`, borderRadius: 2 }} />
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── WHAT PEOPLE ARE DOING ── */}
            <div style={{ ...box, marginBottom: 24 }}>
              <div style={label}>What People Are Doing — last 30 days</div>
              <div style={{ ...hint, marginBottom: 10 }}>Most-used actions first. This is what the app is actually being used for.</div>
              {Object.keys(data.featureUsage).length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  Nothing recorded yet — this fills in as people use the app.
                </p>
              ) : (
                <div>
                  {Object.entries(data.featureUsage).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                    const top = Math.max(...Object.values(data.featureUsage), 1);
                    return (
                      <div key={name} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span>{friendly(name)}</span>
                          <span style={{ color: "#ffd700", fontWeight: 700 }}>{count}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                          <div style={{ width: `${Math.max(3, (count / top) * 100)}%`, height: 4, borderRadius: 2, background: "linear-gradient(90deg,#ffd700,#d4a5ff)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── SAFETY & SUPPORT ── */}
            {(data.moderation || data.refunds || data.calls) && (
              <>
                <div style={groupTitle}>Safety, support &amp; calls</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
                  {data.moderation && (
                    <>
                      <div style={{ ...box, borderLeft: `3px solid ${data.moderation.open > 0 ? "#ff6b6b" : "#98FB98"}` }}>
                        <div style={label}>Reports Needing Review</div>
                        <div style={{ ...bigNum, color: data.moderation.open > 0 ? "#ff6b6b" : "#98FB98" }}>{data.moderation.open}</div>
                        <div style={hint}>{data.moderation.resolved} handled so far</div>
                      </div>
                      <div style={{ ...box, borderLeft: "3px solid #4ecdc4" }}>
                        <div style={label}>Avg. Review Time</div>
                        <div style={{ ...bigNum, color: "#4ecdc4" }}>
                          {data.moderation.avgResolutionHours !== null ? `${data.moderation.avgResolutionHours}h` : "—"}
                        </div>
                        <div style={hint}>How fast a report gets handled</div>
                      </div>
                    </>
                  )}
                  {data.refunds && (
                    <div style={{ ...box, borderLeft: "3px solid #E1BEE7" }}>
                      <div style={label}>Refund Requests</div>
                      <div style={{ ...bigNum, color: "#E1BEE7" }}>{data.refunds.open}</div>
                      <div style={hint}>{data.refunds.total} total · {data.refunds.approved} approved</div>
                    </div>
                  )}
                  {data.calls && (
                    <div style={{ ...box, borderLeft: "3px solid #ffd700" }}>
                      <div style={label}>Calls</div>
                      <div style={{ ...bigNum, color: "#ffd700" }}>{data.calls.total}</div>
                      <div style={hint}>{data.calls.answered} answered · {data.calls.missed} missed · {data.calls.voicemails} voicemail</div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── TOP CREATORS ── */}
            {data.topCreators && data.topCreators.length > 0 && (
              <>
                <div style={groupTitle}>Most active people (last 7 days)</div>
                <div style={{ ...box, marginBottom: 28 }}>
                  {data.topCreators.map((c, i) => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < data.topCreators!.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", fontSize: 13 }}>
                      <span>{i + 1}. {c.name || "Unnamed"}{c.type ? ` · ${c.type}` : ""}</span>
                      <span style={{ color: "#ffd700", fontWeight: 700 }}>{c.activity} actions</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── LATEST EVENTS ── */}
            <div style={box}>
              <div style={label}>Latest Activity — newest first</div>
              <div style={{ ...hint, marginBottom: 10 }}>A live feed of what just happened, in plain English.</div>
              {data.recentEvents.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Nothing has happened yet.</p>
              ) : (
                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                  {data.recentEvents.map((e, i) => {
                    const detail = propsText(e.props);
                    return (
                      <div key={i} style={{ fontSize: 13, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "#ffd700", fontWeight: 600 }}>{friendly(e.name)}</span>
                          <span style={{ color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", fontSize: 12 }}>
                            {new Date(e.created_at).toLocaleString()}
                          </span>
                        </div>
                        {detail && (
                          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>{detail}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── ADMIN AUDIT LOG ── */}
            {Array.isArray(data.auditLog) && data.auditLog.length > 0 && (
              <>
                <div style={groupTitle}>Admin activity log</div>
                <div style={{ ...box, marginBottom: 28 }}>
                  <div style={{ ...hint, marginBottom: 8 }}>Who changed what, newest first — useful when something unexpected happens.</div>
                  {data.auditLog.slice(0, 25).map((a, i) => (
                    <div key={a.id || i} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ color: "rgba(255,255,255,0.75)", wordBreak: "break-word" }}>{String(a.query_text || a.action || "(no detail)").slice(0, 160)}</span>
                      <span style={{ color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── WHAT NEEDS ATTENTION ── */}
            <div style={{ ...groupTitle, marginTop: 28 }}>What needs attention</div>
            <div style={box}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9, color: "rgba(255,255,255,0.75)" }}>
                {data.totals.users === 0 && <li>No accounts yet — the invite links are the fastest way to get the first few people in.</li>}
                {data.retention.retentionRatePct !== null && data.retention.retentionRatePct < 25 && (
                  <li>Fewer than 1 in 4 people came back this week. Worth a re-engagement email or a push notification.</li>
                )}
                {data.totals.matches === 0 && data.totals.users > 1 && (
                  <li>Nobody has matched yet — check that profiles have photos and that Discover is showing candidates.</li>
                )}
                {data.payments && data.payments.succeeded === 0 && data.payments.total > 0 && (
                  <li>Payments are being attempted but none succeeded — check the Stripe keys and webhook.</li>
                )}
                {data.connectedAccounts === 0 && (
                  <li>No creator has finished Stripe setup yet, so nobody can be paid for a booking.</li>
                )}
                {data.totals.users > 0 && data.totals.matches > 0 && (data.retention.retentionRatePct ?? 0) >= 25 && (
                  <li>Nothing urgent — people are joining, connecting and coming back.</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
