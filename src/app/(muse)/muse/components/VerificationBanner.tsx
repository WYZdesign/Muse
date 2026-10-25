/** Verification expiry banner: slides over the bottom nav to prompt verify or dismiss while identity verification is missing or expiring, rendered by page.tsx. */
"use client";

import { FiX } from "react-icons/fi";
import { useEffect, useState } from "react";

/**
 * Measures how much vertical space the active screen reserves at the bottom
 * (the chat composer and its optional quick-reply chips, or the nav), so the
 * banner clears whatever is actually there instead of assuming a nav height.
 *
 * A CSS `body:has(.chat-input-wrap)` rule cannot do this: screens are
 * lazy-mounted and kept alive, so once a chat has been opened the composer
 * stays in the DOM and a :has() selector would match on every later screen.
 * This only looks inside `.screen-el.active`, and returns null (leaving the
 * --nav-h default untouched) on screens without a composer or quick replies.
 */
function useFloorOffset(): number | null {
  const [offset, setOffset] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let queued = false;

    const measure = () => {
      if (cancelled) return;
      const active = document.querySelector(".screen-el.active");
      if (!active) { setOffset(null); return; }
      const hasChatFloor = !!active.querySelector(".chat-input-wrap, .quick-replies");
      if (!hasChatFloor) { setOffset(null); return; }
      const rects = [...active.querySelectorAll(".quick-replies, .chat-input-wrap, .nav")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0);
      if (rects.length === 0) { setOffset(null); return; }
      // Clear the topmost bottom-anchored element, not the first in DOM order.
      const top = Math.min(...rects.map((r) => r.top));
      setOffset(Math.max(0, Math.round(window.innerHeight - top)));
    };

    const schedule = () => {
      if (queued || cancelled) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; measure(); });
    };

    measure();
    // Entrance animations (screen + staggered message bubbles) settle at
    // different times, so a polling burst is more reliable than one event.
    const timers = [60, 160, 320, 600, 1000, 1400].map((d) => setTimeout(measure, d));
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("resize", schedule);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      mo.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return offset;
}

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
  const floorOffset = useFloorOffset();
  if ((ageVerified && !verificationExpiringSoon) || dismissed) return null;
  return (
    <div className={"verify-banner" + (closing ? " verify-banner-closing" : "")} style={{ position: "absolute", bottom: floorOffset != null ? `${floorOffset}px` : "var(--nav-h, calc(72px + env(safe-area-inset-bottom, 0px)))", left: 0, right: 0, zIndex: 9999, background: verificationExpiringSoon ? "linear-gradient(135deg, #ff8c00, #ffd700)" : "linear-gradient(135deg, #ff4444, #ff6b6b)", padding: "10px 44px 10px 10px", boxShadow: "0 -4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0a0612", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, whiteSpace: "nowrap", overflow: "hidden", opacity: 0.85 }}>
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
