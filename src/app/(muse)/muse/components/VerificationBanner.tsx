"use client";

import { FiX } from "react-icons/fi";

/**
 * P2 extraction: the verification-expiry banner, moved out of page.tsx.
 * Absolutely-positioned overlay attached to the top edge of the bottom nav —
 * slides in over the nav on show and back out on dismiss (see .verify-banner
 * keyframes in muse.css). Renders nothing when it shouldn't be visible.
 */
export type VerificationBannerProps = {
  ageVerified: boolean;
  verificationExpiringSoon: boolean;
  dismissed: boolean;
  closing: boolean;
  onVerify: () => void;
  onDismiss: () => void;
};

export function VerificationBanner({ ageVerified, verificationExpiringSoon, dismissed, closing, onVerify, onDismiss }: VerificationBannerProps) {
  if ((ageVerified && !verificationExpiringSoon) || dismissed) return null;
  return (
    <div className={"verify-banner" + (closing ? " verify-banner-closing" : "")} style={{ position: "absolute", bottom: "var(--nav-h, calc(72px + env(safe-area-inset-bottom, 0px)))", left: 0, right: 0, zIndex: 9999, background: verificationExpiringSoon ? "linear-gradient(135deg, #ff8c00, #ffd700)" : "linear-gradient(135deg, #ff4444, #ff6b6b)", padding: "10px 44px 10px 10px", boxShadow: "0 -4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0a0612", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, whiteSpace: "nowrap", overflow: "hidden", opacity: 0.85 }}>
      <span>{verificationExpiringSoon ? "Your verification is expiring soon" : "Verify identity for full features."}</span>
      <button onClick={onVerify} style={{ minWidth: 44, minHeight: 44, background: "none", border: "none", color: "#0a0612", textDecoration: "underline", cursor: "pointer", fontWeight: 800, padding: 0, whiteSpace: "nowrap", flexShrink: 0 }}>Verify Now</button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ position: "absolute", top: "50%", right: 4, transform: "translateY(-50%)", width: 44, height: 44, background: "none", border: "none", color: "#0a0612", opacity: 0.75, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <FiX size={15} />
      </button>
    </div>
  );
}
