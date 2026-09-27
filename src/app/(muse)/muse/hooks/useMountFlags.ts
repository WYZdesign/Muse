"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * Mount-time local flags, extracted verbatim from page.tsx's two mount effects:
 * restoring the persisted verification-banner dismissal and bumping the open
 * counter. Same empty dependency arrays, same guards.
 */
export type UseMountFlagsArgs = {
  safeGetItem: (key: string) => string | null;
  safeSetItem: (key: string, value: string) => boolean;
  setVerificationBannerDismissed: Dispatch<SetStateAction<boolean>>;
};

export function useMountFlags({
  safeGetItem,
  safeSetItem,
  setVerificationBannerDismissed,
}: UseMountFlagsArgs) {
  // D1: persist dismiss across reloads (same pattern as muse_tour_seen_*).
  useEffect(() => {
    try {
      if (safeGetItem("muse_verify_banner_dismissed") === "1") setVerificationBannerDismissed(true);
    } catch { /* storage unavailable — show banner */ }
  }, []);

  useEffect(() => {
    try {
        const c = safeGetItem("muse_open_count");
        const count = c ? parseInt(c) + 1 : 1;
        safeSetItem("muse_open_count", String(count));
      } catch (e) { console.debug("[page.tsx] open count storage ignore", e); }
  }, []);
}
