"use client";

import { useEffect, useRef } from "react";

/**
 * Cross-device preference persistence, extracted verbatim from page.tsx's
 * prefs-snapshot + debounced save pair. The two effects and their shared refs
 * move together (the snapshot effect feeds the ref the debounced effect
 * reads), preserving both their relative order and their dependency arrays.
 * `authUser` is only truth-tested, so a minimal structural type is enough.
 */
export type UsePreferenceSyncArgs = {
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  authUser: { id?: string } | null;
  obStep: number;
  notifPrefs: Record<string, boolean>;
  filterStyles: string[];
  filterScore: number;
  appliedBriefs: number[];
  showNsfw: boolean;
};

export function usePreferenceSync({
  apiFetch,
  authUser,
  obStep,
  notifPrefs,
  filterStyles,
  filterScore,
  appliedBriefs,
  showNsfw,
}: UsePreferenceSyncArgs) {
  const prefsSnapshotRef = useRef({ obStep, notifPrefs, filterStyles, filterScore, appliedBriefs, showNsfw });
  const prefsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { prefsSnapshotRef.current = { obStep, notifPrefs, filterStyles, filterScore, appliedBriefs, showNsfw }; });

  useEffect(() => {
    if (!authUser) return;
    if (prefsTimerRef.current) clearTimeout(prefsTimerRef.current);
    prefsTimerRef.current = setTimeout(() => {
      const p = prefsSnapshotRef.current;
      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { onboardingStep: p.obStep, notifications: p.notifPrefs, filterStyles: p.filterStyles, filterScore: p.filterScore, appliedBriefs: p.appliedBriefs, nsfw: p.showNsfw } }) }).catch(() => {});
    }, 2000);
    return () => { if (prefsTimerRef.current) clearTimeout(prefsTimerRef.current); };
  }, [apiFetch, obStep, notifPrefs, filterStyles, filterScore, appliedBriefs, showNsfw, authUser]);
}
