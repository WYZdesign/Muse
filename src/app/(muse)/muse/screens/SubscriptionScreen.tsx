"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";
import { TIERS } from "../components/types";
import { startSubscriptionCheckout } from "../lib/api";

export interface SubscriptionScreenProps {
  screen: Screen;
  currentUser: any;
  userTier: string;
  authUser: any;
  showScreen: (s: Screen) => void;
  openHamburger: () => void;
  unreadNotificationCount: number;
  showToast: (msg: string) => void;
}

export const SubscriptionScreen = memo(function SubscriptionScreen({
  screen,
  currentUser,
  userTier,
  authUser,
  showScreen,
  openHamburger,
  unreadNotificationCount,
  showToast,
}: SubscriptionScreenProps) {
  if (screen !== "subscription") return null;

  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  return (
    <div className="phone-wrap">
      <div className="phone" id="muse-app">
        <div className="hdr">
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Playfair Display', serif", background: "linear-gradient(135deg, var(--gold), var(--lavender))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Muse Pro</div>
          <button className="hdr-btn" onClick={() => showScreen("profile")} aria-label="Back to Profile"><FiArrowLeft size={18} /></button>
        </div>
        <div className="sub-scroll">
          <div className="sub-header">
            <div className="sub-title">Unlock Your Potential</div>
            <div className="sub-subtitle">Choose the plan for your creative journey</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="inp" placeholder="Promo code" value={promo} onChange={e => { setPromo(e.target.value); setPromoApplied(false); }} style={{ flex: 1, textTransform: "uppercase", letterSpacing: 1 }} />
            <button className="btn btn-outline" style={{ padding: "0 16px" }} onClick={() => { const p = promo.trim().toUpperCase(); if (p === "MUSEBETA") { setPromoApplied(true); showToast("Muse Beta applied — $0/month"); } else if (p) { showToast("Invalid promo code"); } else { showToast("Enter a promo code first"); } }}>Apply</button>
          </div>
          {promoApplied && (
            <div style={{ padding: "8px 14px", marginBottom: 12, borderRadius: 12, background: "rgba(76,221,136,0.12)", border: "1px solid rgba(76,221,136,0.3)", fontSize: 12, fontWeight: 700, color: "#4cdd88" }}>✓ MUSEBETA applied — you won't be charged</div>
          )}
          {currentUser.foundingTier && (
            <div style={{ padding: "12px 16px", borderRadius: 16, marginBottom: 14, background: currentUser.foundingTier === "founding" ? "rgba(255,215,0,0.1)" : "rgba(212,165,255,0.1)", border: `1px solid ${currentUser.foundingTier === "founding" ? "rgba(255,215,0,0.3)" : "rgba(212,165,255,0.3)"}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: currentUser.foundingTier === "founding" ? "var(--gold)" : "var(--lavender)" }}>{currentUser.foundingTier === "founding" ? "🏆 Founding Member, Lifetime Pro" : "⭐ Early Member, Free Pro"}</div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                {currentUser.foundingTier === "founding"
                  ? "You're locked in for life. Thanks for believing in Muse."
                  : currentUser.proExpiresAt ? `Free Pro until ${new Date(currentUser.proExpiresAt).toLocaleDateString()}. Then $9.99/mo or earn it via referrals.` : "Free Pro as an early believer."}
              </div>
            </div>
          )}
          {TIERS.map(tier => {
            const tierKey = tier.name.toLowerCase().replace(" ", "_");
            const isCurrent = tierKey === userTier || (tierKey === "muse_pro" && currentUser.tier === "muse_pro");
            return (
              <div key={tier.name} className={"tier-card" + (isCurrent ? " current" : "")} style={{ position: "relative" }}>
                <div className="tier-header">
                  <div className="tier-name">{tier.name}</div>
                  <div><span className="tier-price">{tier.price}</span><span className="tier-period">{tier.period}</span></div>
                </div>
                <ul className="tier-features">{tier.features.map(f => <li key={f}>{f}</li>)}</ul>
                <button
                  className={"tier-btn" + (tier.name === "Muse Pro" ? " tier-btn-primary" : " tier-btn-outline")}
                  onClick={async () => {
                    if (isCurrent) return;
                    if (tier.name === "Free") { showToast("You're on the Free plan"); return; }
                    const url = await startSubscriptionCheckout(tierKey, authUser?.email, showToast, promo.trim() || undefined);
                    if (url) { window.location.href = url; }
                  }}
                >
                  {isCurrent ? "Current Plan" : tier.name === "Free" ? "Free Plan" : "Select " + tier.name}
                </button>
              </div>
            );
          })}
        </div>
        <Nav active="profile" onNavigate={showScreen} onHamburgerToggle={openHamburger} unreadCount={unreadNotificationCount} />
      </div>
    </div>
  );
});

export default SubscriptionScreen;
