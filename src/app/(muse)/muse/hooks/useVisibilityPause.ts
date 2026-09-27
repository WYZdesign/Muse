"use client";

import { useEffect } from "react";

/**
 * Pauses ambient animations when the tab is hidden (battery/thermal/cpu
 * savings), extracted verbatim from page.tsx. Single empty-dep effect.
 */
export function useVisibilityPause() {
  // Pause ambient animations when tab hidden (battery/thermal/cpu savings)
  useEffect(() => {
    const onVis = () => { document.body.classList.toggle("animations-paused", document.hidden); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
}
