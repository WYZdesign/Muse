"use client";

import { useEffect, useState } from "react";
import { FiShield } from "react-icons/fi";

export type CommunityBansMutesProps = {
  communityId: string;
  /** Server allows lifting bans/mutes for community admins only. */
  canLift: boolean;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
};

type BanRow = { user_id: string; reason: string | null; created_at: string };
type MuteRow = { user_id: string; expires_at: string | null; created_at: string };

const POST = { method: "POST", headers: { "Content-Type": "application/json" } } as const;

function shortId(id: string): string {
  const s = String(id || "");
  return s.length > 8 ? `${s.slice(0, 8)}…` : s || "unknown";
}

export function CommunityBansMutes({ communityId, canLift, apiFetch, showToast }: CommunityBansMutesProps) {
  const [bans, setBans] = useState<BanRow[] | null>(null);
  const [mutes, setMutes] = useState<MuteRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setBans(null);
    setMutes(null);
    (async () => {
      try {
        const [bRes, mRes] = await Promise.all([
          apiFetch("/api/muse", { ...POST, body: JSON.stringify({ action: "get-community-bans", communityId }) }),
          apiFetch("/api/muse", { ...POST, body: JSON.stringify({ action: "get-community-mutes", communityId }) }),
        ]);
        const bData = await bRes.json().catch(() => ({}));
        const mData = await mRes.json().catch(() => ({}));
        if (cancelled) return;
        setBans(Array.isArray(bData.bans) ? bData.bans : []);
        setMutes(Array.isArray(mData.mutes) ? mData.mutes : []);
      } catch {
        if (cancelled) return;
        setBans([]);
        setMutes([]);
        setError("Couldn't load bans and mutes");
      }
    })();
    return () => { cancelled = true; };
  }, [communityId, reloadKey, apiFetch]);

  const lift = async (kind: "ban" | "mute", userId: string) => {
    setBusy(`${kind}:${userId}`);
    setError("");
    try {
      const r = await apiFetch("/api/muse", {
        ...POST,
        body: JSON.stringify({
          action: kind === "ban" ? "unban-community-member" : "unmute-community-member",
          communityId,
          targetUserId: userId,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setError(e.error || `Couldn't ${kind === "ban" ? "unban" : "unmute"} member (${r.status})`);
        return;
      }
      if (kind === "ban") setBans(prev => (prev || []).filter(x => x.user_id !== userId));
      else setMutes(prev => (prev || []).filter(x => x.user_id !== userId));
      showToast(kind === "ban" ? "Member unbanned" : "Member unmuted");
    } catch {
      setError(`Couldn't ${kind === "ban" ? "unban" : "unmute"} member — try again`);
    } finally {
      setBusy(null);
    }
  };

  const loading = bans === null || mutes === null;
  const empty = !loading && (bans?.length ?? 0) === 0 && (mutes?.length ?? 0) === 0;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <FiShield size={13} /> Bans &amp; Mutes
      </div>

      {error && (
        <div role="alert" style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey(k => k + 1)} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading bans and mutes…</div>
      ) : empty ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>No bans or mutes.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(bans || []).map(b => (
            <div key={`ban-${b.user_id}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#ff6b6b", fontWeight: 700, flexShrink: 0 }}>Banned</span>
              <span style={{ fontSize: 13, color: "var(--text2)", flex: 1 }}>
                {shortId(b.user_id)}{b.reason ? ` — ${b.reason}` : ""}
              </span>
              {canLift && (
                <button
                  type="button"
                  disabled={busy === `ban:${b.user_id}`}
                  onClick={() => void lift("ban", b.user_id)}
                  style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(120,255,150,0.12)", border: "1px solid rgba(120,255,150,0.3)", color: "#7ee2a0", fontSize: 11, fontWeight: 700, cursor: busy === `ban:${b.user_id}` ? "default" : "pointer", opacity: busy === `ban:${b.user_id}` ? 0.5 : 1 }}
                >
                  {busy === `ban:${b.user_id}` ? "…" : "Unban"}
                </button>
              )}
            </div>
          ))}
          {(mutes || []).map(m => (
            <div key={`mute-${m.user_id}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, flexShrink: 0 }}>Muted</span>
              <span style={{ fontSize: 13, color: "var(--text2)", flex: 1 }}>
                {shortId(m.user_id)}{m.expires_at ? ` — until ${new Date(m.expires_at).toLocaleString()}` : " — indefinite"}
              </span>
              {canLift && (
                <button
                  type="button"
                  disabled={busy === `mute:${m.user_id}`}
                  onClick={() => void lift("mute", m.user_id)}
                  style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(120,255,150,0.12)", border: "1px solid rgba(120,255,150,0.3)", color: "#7ee2a0", fontSize: 11, fontWeight: 700, cursor: busy === `mute:${m.user_id}` ? "default" : "pointer", opacity: busy === `mute:${m.user_id}` ? 0.5 : 1 }}
                >
                  {busy === `mute:${m.user_id}` ? "…" : "Unmute"}
                </button>
              )}
            </div>
          ))}
          {!canLift && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Only community admins can lift bans and mutes.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default CommunityBansMutes;
