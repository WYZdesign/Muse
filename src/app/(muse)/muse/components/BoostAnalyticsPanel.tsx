"use client";

import { useCallback, useEffect, useState } from "react";
import { FiZap } from "react-icons/fi";

/**
 * "How did my boost do" panel for the user-scoped `boost-analytics` action.
 * The action (lib/muse-actions/misc.ts) is authenticated and reads only the
 * caller's own row, so this panel lives in the user's Settings screen — there
 * is no admin view of another member's boost numbers. Renders exactly the
 * fields the handler returns (isBoosted/boostStartedAt/expiresAt/inventory and
 * stats.{profileViews,matchesReceived,likesReceived}) with loading, empty and
 * error states.
 */
export type BoostAnalyticsPanelProps = {
  apiFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
};

type BoostAnalytics = {
  isBoosted: boolean;
  boostStartedAt: string | null;
  expiresAt: string | null;
  inventory: number;
  stats: { profileViews: number; matchesReceived: number; likesReceived: number };
};

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

// The action is a write-tier read (not in the demo read allowlist), so demo
// mode never calls it — mirror the shop-window convention the rest of the app
// uses and show a populated sample instead of a dead 409.
const DEMO_DATA: BoostAnalytics = {
  isBoosted: true,
  boostStartedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
  inventory: 2,
  stats: { profileViews: 148, matchesReceived: 9, likesReceived: 31 },
};

const POST = { method: "POST", headers: { "Content-Type": "application/json" } } as const;

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

export function BoostAnalyticsPanel({ apiFetch }: BoostAnalyticsPanelProps) {
  const [data, setData] = useState<BoostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      if (DEMO_MODE) {
        if (!cancelled) { setData(DEMO_DATA); setLoading(false); }
        return;
      }
      if (!apiFetch) {
        if (!cancelled) { setData(null); setError("Couldn't load boost performance"); setLoading(false); }
        return;
      }
      try {
        const res = await apiFetch("/api/muse", { ...POST, body: JSON.stringify({ action: "boost-analytics" }) });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        const stats = body && typeof body.stats === "object" && body.stats ? body.stats : {};
        setData({
          isBoosted: !!body.isBoosted,
          boostStartedAt: body.boostStartedAt || null,
          expiresAt: body.expiresAt || null,
          inventory: Number(body.inventory || 0),
          stats: {
            profileViews: Number(stats.profileViews || 0),
            matchesReceived: Number(stats.matchesReceived || 0),
            likesReceived: Number(stats.likesReceived || 0),
          },
        });
      } catch {
        if (!cancelled) { setData(null); setError("Couldn't load boost performance"); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, reloadKey]);

  const retry = useCallback(() => setReloadKey(k => k + 1), []);

  if (loading) {
    return <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading boost performance…</div>;
  }

  if (error) {
    return (
      <div role="alert" style={{ fontSize: 12, color: "#ff6b6b", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>{error}</span>
        <button type="button" onClick={retry} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return <div style={{ fontSize: 12, color: "var(--muted)" }}>No boost activity yet.</div>;
  }

  const { stats } = data;
  const hasActivity = data.isBoosted || stats.profileViews > 0 || stats.matchesReceived > 0 || stats.likesReceived > 0;

  const statCards: Array<{ label: string; value: number }> = [
    { label: "Profile views", value: stats.profileViews },
    { label: "Likes received", value: stats.likesReceived },
    { label: "Matches gained", value: stats.matchesReceived },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: data.isBoosted ? "linear-gradient(135deg, var(--gold), var(--coral))" : "rgba(255,255,255,0.06)", color: data.isBoosted ? "#1a1a1a" : "var(--muted)" }}>
          <FiZap size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          {data.isBoosted ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gold)" }}>⚡ Boost active</div>
              {data.expiresAt && <div style={{ fontSize: 12, color: "var(--text2)" }}>Until {formatWhen(data.expiresAt)}</div>}
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>No active boost</div>
          )}
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {data.boostStartedAt ? `Since ${formatWhen(data.boostStartedAt)}` : "Last 7 days"}
          </div>
        </div>
      </div>

      {hasActivity ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {statCards.map(card => (
              <div key={card.label} style={{ padding: "12px 10px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--border-subtle)", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--gold)", lineHeight: 1.1 }}>{formatNumber(card.value)}</div>
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>
            {data.inventory > 0
              ? <>You have <strong style={{ color: "var(--gold)" }}>{data.inventory}</strong> boost credit{data.inventory === 1 ? "" : "s"} available.</>
              : <>No boost credits available — earn one via quests or buy a boost.</>}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 12px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📈</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>No boost activity yet</div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>Activate a boost to see how many views, likes and matches it brings in.</div>
        </div>
      )}
    </div>
  );
}

export default BoostAnalyticsPanel;
