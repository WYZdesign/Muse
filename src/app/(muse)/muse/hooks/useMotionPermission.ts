"use client";

import { useEffect } from "react";
import { requestMotionPermission } from "./useDeviceTilt";

/**
 * One-time iOS motion-permission request on the app's first touch, extracted
 * verbatim from page.tsx. Same once:true listener and empty dep array.
 */
export function useMotionPermission() {
  // iOS 13+ only fires deviceorientation events after DeviceOrientationEvent.
  // requestPermission() is called from inside a direct user-gesture handler.
  // Rather than gate that behind a dedicated settings toggle, ask on the
  // app's very first touch — the gyroscope-driven tilt effects (background
  // orbs, Discover card hero) are ambient polish, not a feature anything
  // depends on, so a silent one-time request here (no dialog if the platform
  // doesn't need one — Android/desktop) is enough. {once:true} handles both
  // "asked, granted" and "asked, denied" — never asks twice in a session.
  useEffect(() => {
    const onFirstTouch = () => requestMotionPermission();
    document.addEventListener("pointerdown", onFirstTouch, { once: true, passive: true });
    return () => document.removeEventListener("pointerdown", onFirstTouch);
  }, []);
}
