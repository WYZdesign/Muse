"use client";

import React from "react";
import type { Screen } from "./types";
import { TIERS, TIERS_BY_SIDE } from "./types";
import { viewerSideOf } from "@/lib/role";

// Reusable contextual upsell modal — shown at the moment a free-tier user
// hits a Pro-gated limit (Rewind, Boost, daily/super likes, viewing "Likes
// You" profiles, etc). Replaces the generic "Upgrade to Muse Pro..." toast
// with a real in-context paywall moment, Tinder-style: name the specific
// benefit being gated, explain why it matters right now, and show the real
// tier(s) that unlock it — pulled live from TIERS_BY_SIDE so pricing/features
// can never drift out of sync with SubscriptionScreen.
export interface UpsellModalProps {
  open: boolean;
  onClose: () => void;
  /** The specific benefit being gated, e.g. "Unlimited Rewinds". */
  feature: string;
  /** One-line reason this benefit matters right now, e.g. "Never lose a swipe again." */
  reason: string;
  /** Optional emoji shown above the headline. Defaults to a sparkle. */
  icon?: string;
  currentUser: any;
  showScreen: (screen: Screen) => void;
}

export default function UpsellModal({ open, onClose, feature, reason, icon = "✨", currentUser, showScreen }: UpsellModalProps) {
  if (!open) return null;

  const tiers = TIERS_BY_SIDE[viewerSideOf(currentUser) as "creative" | "industry"] || TIERS;
  const unlockTiers = tiers.filter(t => t.name !== "Free");

  return (
    <div className="modal-overlay" role="presentation" aria-hidden="true" onClick={onClose} style={{ zIndex: 600 }}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={feature}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 400, width: "90%", maxHeight: "85vh", overflowY: "auto", borderRadius: 24, padding: "26px 22px", background: "linear-gradient(180deg,#0f081e,#0a0612)", textAlign: "center" }}
      >
        <div style={{ fontSize: 40, marginBottom: 6 }}>{icon}</div>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Playfair Display',serif", fontStyle: "italic", color: "var(--gold)", marginBottom: 6 }}>{feature}</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5 }}>{reason}</div>

        {unlockTiers.map(tier => (
          <div key={tier.name} className="tier-card" style={{ textAlign: "left", padding: 16, marginBottom: 12 }}>
            <div className="tier-header" style={{ marginBottom: 8 }}>
              <div className="tier-name" style={{ fontSize: 16 }}>{tier.name}</div>
              <div><span className="tier-price" style={{ fontSize: 20 }}>{tier.price}</span><span className="tier-period">{tier.period}</span></div>
            </div>
            <ul className="tier-features" style={{ marginBottom: 0 }}>{tier.features.slice(0, 4).map(f => <li key={f}>{f}</li>)}</ul>
          </div>
        ))}

        <button className="btn btn-gold" style={{ width: "100%", marginTop: 4 }} onClick={() => { onClose(); showScreen("subscription"); }}>
          See Plans
        </button>
        <button className="btn btn-outline" style={{ width: "100%", marginTop: 10 }} onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
