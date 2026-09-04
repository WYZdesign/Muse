"use client";

import React, { memo, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import Nav from "../components/Nav";
import type { Screen } from "../components/types";
import { TIERS, TIERS_BY_SIDE } from "../components/types";
import { viewerSideOf } from "@/lib/role";
import { startSubscriptionCheckout } from "../lib/api";

export interface SubscriptionScreenProps {
  screen: Screen;
  currentUser: any;
  userTier: string;
  setUserTier?: (t: string) => void;
  authUser: any;
  showScreen: (s: Screen) => void;
  openHamburger: () => void;
  unreadNotificationCount: number;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  apiFetch?: (url: string, opts?: any) => Promise<Response>;
}

export const SubscriptionScreen = memo(function SubscriptionScreen({
  screen,
  currentUser,
  userTier,
  setUserTier,
  authUser,
  showScreen,
  openHamburger,
  unreadNotificationCount,
  showToast,
  apiFetch,
}: SubscriptionScreenProps) {
  if (screen !== "subscription") return null;

  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);

  return (
    <div className="phone-wrap">
      <div className="phone" id="muse-app">
        <div className="hdr" style={{ justifyContent: "space-between", alignItems: "center", padding: `calc(12px + env(safe-area-inset-top,0px)) 18px 12px` }}>
          <div
            className="logo-link"
            style={{
              fontSize: 30,
              backgroundImage: "linear-gradient(90deg,#FFD700,#FFB5C2,#B388FF,#FFD700,#FFB5C2,#FFD700)",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              position: "relative",
              margin: 0,
              padding: 0,
              whiteSpace: "nowrap",
            }}
          >Muse Pro</div>
          <button className="hdr-btn" onClick={() => showScreen("profile")} aria-label="Back to Profile"><FiArrowLeft size={18} /></button>
        </div>
        <div className="sub-scroll">
          <div className="sub-header">
            <div className="sub-title">Unlock Your Potential</div>
            <div className="sub-subtitle">Choose the plan for your creative journey</div>
          </div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input className="inp" placeholder="Promo code" value={promo} onChange={e => { setPromo(e.target.value); setPromoApplied(false); }} style={{ width: "100%", textTransform: "uppercase", letterSpacing: 1, paddingRight: 84 }} />
            <button className="btn btn-outline" style={{ position: "absolute", top: 5, right: 5, padding: "8px 16px", opacity: applyingPromo ? 0.6 : 1 }} disabled={applyingPromo} onClick={async () => {
              const p = promo.trim().toUpperCase();
              if (!p) { showToast("Enter a promo code first"); return; }
              if (!apiFetch) { showToast("Can't apply promo right now"); return; }
              setApplyingPromo(true);
              try {
                const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply-promo", code: p }) });
                if (r.ok) {
                  setPromoApplied(true);
                  setUserTier?.("muse_pro");
                  showToast("Muse Beta applied — $0/month");
                } else if (r.status === 404) {
                  showToast("Invalid promo code");
                } else {
                  showToast("Couldn't apply promo code — try again");
                }
              } catch { showToast("Couldn't apply promo code — try again"); }
              setApplyingPromo(false);
            }}>Apply</button>
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
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Browse plans below anytime — you won't be charged.</div>
            </div>
          )}
          {(TIERS_BY_SIDE[viewerSideOf(currentUser) as "creative" | "industry"] || TIERS).map(tier => {
            const tierKey = tier.name.toLowerCase().replace(/ /g, "_");
            const isCurrent = tierKey === userTier || (tierKey === "muse_pro" && currentUser.tier === "muse_pro");
            return (
              <div key={tier.name} className={"tier-card" + (isCurrent ? " current" : "")} style={{ position: "relative" }}>
                {isCurrent && (
                  <div style={{ position: "absolute", top: -10, right: 12, padding: "4px 12px", borderRadius: 999, background: "linear-gradient(135deg, var(--gold), var(--lavender))", color: "#0a0612", fontSize: 11, fontWeight: 800, letterSpacing: 0.02, boxShadow: "0 4px 14px rgba(255,215,0,0.35)" }}>✓ You have this</div>
                )}
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
