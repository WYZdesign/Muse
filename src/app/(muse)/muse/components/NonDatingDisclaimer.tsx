"use client";

import React, { useState } from "react";
import { safeGetItem, safeSetItem } from "../lib/safe-storage";

const DISMISS_KEY = "muse_disclaimer_dismissed";

/**
 * Professional collaboration disclaimer used where dating-app ambiguity is
 * possible (onboarding, Discover, Settings).
 *
 * Torreé: "closable and more subtle and less frequent. i dont need to
 * hammer it in, just sprinkled in strategic places as a reminder." —
 * dismissal is persisted (one dismiss anywhere clears it everywhere,
 * across sessions) so it's a one-time reminder, not a nag that reappears
 * on every visit to Discover/Settings/onboarding.
 *
 * 2026-09-15: even the "closable and subtle" version still read as a full
 * sentence of copy sitting inline on every screen it appeared on. Cut down
 * to a single short line ("Not a dating app · ⓘ") that answers the only
 * question it needs to (this isn't a dating app) — tapping the ⓘ opens the
 * fuller explanation as a small popup instead of it living on-page.
 */
export default function NonDatingDisclaimer({ compact = false }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(() => !!safeGetItem(DISMISS_KEY));
  const [showInfo, setShowInfo] = useState(false);
  if (dismissed) return null;
  return (
    <>
      <div
        className="disclaimer-sm"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: compact ? 10.5 : 11.5,
          lineHeight: 1.3,
          padding: compact ? "5px 26px 5px 10px" : "7px 30px 7px 12px",
          borderRadius: 8,
          background: "rgba(255,215,0,0.05)",
          border: "1px solid rgba(255,215,0,0.14)",
          color: "var(--muted)",
          marginBottom: 12,
        }}
      >
        <span>Not a dating app</span>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label="Why Muse isn't a dating app"
          style={{
            background: "none", border: "none", color: "var(--gold)",
            opacity: 0.85, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0,
            display: "flex", alignItems: "center",
          }}
        >
          ⓘ
        </button>
        <button
          type="button"
          onClick={() => { safeSetItem(DISMISS_KEY, "1"); setDismissed(true); }}
          aria-label="Dismiss"
          style={{
            position: "absolute", top: 4, right: 4, width: 20, height: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", color: "var(--muted)",
            opacity: 0.55, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0,
          }}
        >
          ✕
        </button>
      </div>
      {showInfo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="About Muse"
          onClick={() => setShowInfo(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(6,3,14,0.75)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, animation: "fadeIn .2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 320, borderRadius: 20,
              background: "linear-gradient(160deg,#160b2a,#241238 60%,#1a0e2c)",
              border: "1px solid rgba(255,215,0,0.18)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
              padding: "22px 20px 18px", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>🎨</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Not a dating app</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)", marginBottom: 16 }}>
              Muse is for finding and booking verified creative collaborators — photographers, models, stylists, and more. No dating or social matching involved.
            </div>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#ffd700,#ff8a80)", color: "#0a0612",
                fontWeight: 800, fontSize: 13.5, cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
