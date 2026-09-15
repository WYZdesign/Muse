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
 */
export default function NonDatingDisclaimer({ compact = false }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(() => !!safeGetItem(DISMISS_KEY));
  if (dismissed) return null;
  return (
    <div
      className="disclaimer-sm"
      style={{
        position: "relative",
        fontSize: compact ? 10.5 : 11.5,
        lineHeight: 1.5,
        padding: compact ? "6px 26px 6px 10px" : "9px 30px 9px 12px",
        borderRadius: 8,
        background: "rgba(255,215,0,0.05)",
        border: "1px solid rgba(255,215,0,0.14)",
        color: "var(--muted)",
        marginBottom: 12,
      }}
    >
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
      <strong>Muse is a professional creative collaboration platform</strong> — not a dating or social app. Use it to find verified creative partners and book commissioned work.
    </div>
  );
}
