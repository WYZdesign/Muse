"use client";

import React from "react";

/** Professional collaboration disclaimer used where dating-app ambiguity is possible. */
export default function NonDatingDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? "disclaimer-sm" : "disclaimer-sm"}
      style={{
        fontSize: compact ? 11 : 12,
        lineHeight: 1.5,
        padding: compact ? "6px 10px" : "10px 12px",
        borderRadius: 8,
        background: "rgba(255,215,0,0.08)",
        border: "1px solid rgba(255,215,0,0.25)",
        color: "var(--muted)",
        marginBottom: 12,
      }}
    >
      <strong>Muse is a professional creative collaboration platform.</strong>
      It is not a dating app, social networking app, or romantic matching service. Use Muse to find verified creative partners, book sessions, and complete commissioned work only. Do not use Muse to seek dating, dating relationships, or romantic encounters.
    </div>
  );
}
