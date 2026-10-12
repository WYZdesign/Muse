// Two-Factor Authentication sub-page for SettingsScreen. Owns the whole
// sub-page (including the SettingsSubPage wrapper) because closing it has
// side-effecting cleanup — abandoning an in-progress enrollment must drop
// the just-created unverified factor — and that state (loading/enrolling/
// QR/secret/code/error/factors) isn't read anywhere else in the screen.
// `mfaEnabled` is the one piece the parent still needs (it's shown in the
// Privacy & Safety row description), so it's controlled via props.
"use client";

import { useEffect, useState } from "react";
import { FiShield } from "react-icons/fi";
import { mfaStatus, mfaEnroll, mfaVerify, mfaUnenroll } from "../lib/api";
import { SettingsSubPage } from "./SettingsSubPage";

export interface SettingsMFAPanelProps {
  mfaEnabled: boolean;
  setMfaEnabled: (v: boolean) => void;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  onClose: () => void;
}

export function SettingsMFAPanel({ mfaEnabled, setMfaEnabled, showToast, onClose }: SettingsMFAPanelProps) {
  const [mfaFactors, setMfaFactors] = useState<{ id: string; status: string; friendlyName?: string }[]>([]);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQrUri, setMfaQrUri] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaError, setMfaError] = useState("");

  useEffect(() => {
    mfaStatus().then(d => {
      setMfaEnabled(!!d.enabled);
      setMfaFactors(d.factors || []);
      setMfaLoading(false);
    }).catch(() => setMfaLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, same as the original effect gated on showMFA opening
  }, []);

  // Abandoning setup (X / back) must also drop the factor we just created,
  // otherwise a stale unverified factor blocks the next attempt.
  const handleClose = () => {
    const pendingId = mfaFactors[0]?.id;
    if (mfaEnrolling && pendingId) { mfaUnenroll(pendingId).catch(() => { /* best effort */ }); }
    onClose();
  };

  return (
    <SettingsSubPage title="Two-Factor Authentication" onClose={handleClose}>
      {mfaLoading ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--text2)", fontSize: 13 }}>Loading...</div>
      ) : mfaEnrolling ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code below.
          </div>
          {mfaQrUri && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 16, background: "rgba(255,255,255,0.95)", borderRadius: 12, margin: "0 auto" }}>
              {/* Local /api/qr (same-origin) — the old api.qrserver.com URL was
                  blocked by the site CSP img-src, so the QR never rendered. */}
              <img src={`/api/qr?url=${encodeURIComponent(mfaQrUri)}&source=mfa`} alt="MFA QR Code" width={200} height={200} style={{ width: 200, height: 200, display: "block", margin: "0 auto" }} />
            </div>
          )}
          {mfaSecret && (
            <div style={{ textAlign: "center", padding: "8px 12px", background: "var(--card-bg)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Manual entry key:</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "monospace", letterSpacing: 1 }}>{mfaSecret}</div>
            </div>
          )}
          <input
            className="inp"
            type="text"
            inputMode="numeric"
            aria-label="Two-factor authentication code"
            placeholder="Enter 6-digit code"
            value={mfaVerifyCode}
            onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ margin: 0, textAlign: "center", fontSize: 18, letterSpacing: 4 }}
          />
          {mfaError && <div style={{ fontSize: 12, color: "var(--coral)", textAlign: "center" }}>{mfaError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1, fontSize: 13 }} onClick={async () => {
              // Unenroll the factor we just created so abandoning setup doesn't
              // leave a stale unverified factor blocking the next attempt.
              const pendingId = mfaFactors[0]?.id;
              if (pendingId) { try { await mfaUnenroll(pendingId); } catch { /* best effort */ } }
              setMfaFactors([]);
              setMfaEnrolling(false); setMfaQrUri(""); setMfaSecret(""); setMfaVerifyCode(""); setMfaError("");
            }}>Cancel</button>
            <button
              className="btn btn-gold"
              style={{ flex: 1, fontSize: 13 }}
              disabled={mfaVerifyCode.length !== 6}
              onClick={async () => {
                if (!mfaFactors.length) return;
                setMfaError("");
                try {
                  const res = await mfaVerify(mfaFactors[0].id, mfaVerifyCode);
                  if (res.success) {
                    setMfaEnabled(true);
                    setMfaEnrolling(false);
                    setMfaQrUri("");
                    setMfaSecret("");
                    setMfaVerifyCode("");
                    showToast("✓ Two-factor authentication enabled");
                    // Refresh factors
                    const status = await mfaStatus();
                    setMfaFactors(status.factors || []);
                  } else {
                    setMfaError(res.error || "Invalid code — try again");
                  }
                } catch { setMfaError("Verification failed — try again"); }
              }}
            >Verify & Enable</button>
          </div>
        </div>
      ) : mfaEnabled ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
            <FiShield size={20} style={{ color: "var(--text)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Two-factor is active</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>Your account is protected with TOTP verification.</div>
            </div>
          </div>
          {mfaFactors.filter(f => f.status === "verified").map(f => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.friendlyName || "Authenticator"}</div>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>Verified</div>
              </div>
              <button
                className="btn btn-outline"
                style={{ padding: "4px 12px", fontSize: 12, color: "var(--coral)", borderColor: "var(--border-subtle)" }}
                onClick={async () => {
                  try {
                    const res = await mfaUnenroll(f.id);
                    if (res.success) {
                      setMfaEnabled(false);
                      setMfaFactors([]);
                      showToast("Two-factor authentication disabled");
                    } else {
                      showToast(res.error || "Could not disable");
                    }
                  } catch { showToast("Could not disable two-factor"); }
                }}
              >Disable</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
            Two-factor authentication adds an extra layer of security to your account. When enabled, you'll enter a code from your authenticator app each time you sign in.
          </div>
          <button
            className="btn btn-gold"
            style={{ width: "100%", fontSize: 13 }}
            onClick={async () => {
              setMfaLoading(true);
              setMfaError("");
              try {
                // Self-heal: drop any stale unverified factor(s) left by a previous
                // abandoned setup before enrolling, so we never stack factors or
                // trip over a half-finished one.
                const status = await mfaStatus().catch(() => null);
                const stale = (status?.factors || []).filter(f => f.status !== "verified");
                for (const f of stale) {
                  try { await mfaUnenroll(f.id); } catch { /* best effort */ }
                }
                const res = await mfaEnroll();
                if (res.id) {
                  setMfaQrUri(res.qr_uri || res.totp?.qr_code || "");
                  setMfaSecret(res.secret || res.totp?.secret || "");
                  setMfaFactors([{ id: res.id, status: "unverified" }]);
                  setMfaEnrolling(true);
                } else {
                  showToast(res.error || "Could not start setup");
                }
              } catch { showToast("Could not start setup"); }
              setMfaLoading(false);
            }}
          >Set Up Two-Factor</button>
        </div>
      )}
    </SettingsSubPage>
  );
}
