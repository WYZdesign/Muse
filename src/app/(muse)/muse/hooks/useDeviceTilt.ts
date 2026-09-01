"use client";

/**
 * Shared device-tilt engine — one global `deviceorientation` listener + a
 * smoothed (x, y) value, polled by whichever screens want a gyroscope-driven
 * 3D/parallax effect (BackgroundScene's cosmic orbs, Discover's swipe-card
 * hero tilt, and anywhere else this gets applied).
 *
 * Deliberately NOT a React hook that re-renders components on every frame —
 * continuous motion values in this codebase are handled by direct DOM style
 * mutation inside a requestAnimationFrame loop (see the swipe-drag logic and
 * BackgroundScene's own orb animation), not React state. Consumers call
 * `ensureDeviceTiltActive()` once and then read `getDeviceTilt()` inside
 * their own rAF loop.
 *
 * iOS 13+ Safari (and Capacitor's WKWebView, which this app ships in — see
 * ios/App) requires `DeviceOrientationEvent.requestPermission()` to be
 * called from inside a direct user-gesture handler before orientation events
 * will ever fire. `requestMotionPermission()` is exported so callers can wire
 * it to a real gesture (a tap/pointerdown); `page.tsx` wires it to the app's
 * very first touch so nothing extra is needed per-screen. On Android and
 * desktop browsers this call doesn't exist and is skipped — orientation
 * events just work (or don't, e.g. a laptop with no sensor, which is exactly
 * what the smoothing/idle-at-zero behavior below already handles gracefully).
 */

export type DeviceTilt = { x: number; y: number };

let started = false;
let permissionRequested = false;
let raw: DeviceTilt = { x: 0, y: 0 };
let smoothed: DeviceTilt = { x: 0, y: 0 };
let smoothRaf = 0;
let reducedMotion = false;

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function onOrientation(e: DeviceOrientationEvent) {
  // gamma: left/right tilt (-90..90), beta: front/back tilt (-180..180).
  // Clamped and scaled to a gentle -1..1 range — this drives subtle ambient
  // motion, not a precise instrument, so the clamp range favors a natural
  // "resting in your hand" tilt over requiring an exaggerated angle.
  const g = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 35));
  const b = Math.max(-1, Math.min(1, (e.beta ?? 0) / 55 - 0.4)); // -0.4 offset: beta≈45° is a natural resting hold, not flat
  raw = { x: g, y: b };
}

function onMouseFallback(e: MouseEvent) {
  // Desktop/no-sensor fallback so the same effect still reads as "alive" on
  // a laptop trackpad — mirrors the marketing landing page's own pattern.
  raw = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 };
}

function smoothTick() {
  smoothed.x += (raw.x - smoothed.x) * 0.06;
  smoothed.y += (raw.y - smoothed.y) * 0.06;
  smoothRaf = requestAnimationFrame(smoothTick);
}

/** Idempotent — safe to call from every screen/component that wants tilt. */
export function ensureDeviceTiltActive() {
  if (started || typeof window === "undefined") return;
  reducedMotion = prefersReducedMotion();
  if (reducedMotion) return; // never attach listeners; getDeviceTilt() stays {0,0}
  started = true;
  window.addEventListener("deviceorientation", onOrientation, { passive: true });
  if (window.matchMedia?.("(hover: hover)").matches) {
    window.addEventListener("mousemove", onMouseFallback, { passive: true });
  }
  smoothRaf = requestAnimationFrame(smoothTick);
}

/** Latest smoothed tilt, roughly -1..1 on each axis. {0,0} if inactive/reduced-motion. */
export function getDeviceTilt(): DeviceTilt {
  return reducedMotion ? { x: 0, y: 0 } : smoothed;
}

/**
 * Call from inside a real user-gesture event handler (pointerdown/touchstart/
 * click) — iOS silently ignores the permission grant otherwise. No-ops on
 * every platform that doesn't gate orientation behind a permission prompt
 * (Android, desktop, and iOS versions before 13), and only ever prompts once
 * per session.
 */
export function requestMotionPermission() {
  if (permissionRequested || typeof window === "undefined") return;
  const anyDOE = (window as any).DeviceOrientationEvent;
  if (!anyDOE || typeof anyDOE.requestPermission !== "function") return; // nothing to request on this platform
  permissionRequested = true;
  anyDOE.requestPermission().catch(() => {
    // Denied or unsupported — getDeviceTilt() just keeps returning the mouse
    // fallback (or {0,0} on a touch device with no mouse), no error surfaced
    // to the user. This is ambient polish, not a feature anything depends on.
  });
}
