"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * Saved-search hydration, extracted verbatim from page.tsx: refetches the list
 * whenever the Discovery Preferences modal opens. Same guard, same
 * cancelled-flag cleanup and same [showDiscoveryPrefs, apiFetch] deps.
 */
export type UseSavedSearchesArgs = {
  showDiscoveryPrefs: boolean;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  setSavedSearches: Dispatch<SetStateAction<{ id: string; name: string; query?: string; filters?: Record<string, unknown> }[]>>;
};

export function useSavedSearches({ showDiscoveryPrefs, apiFetch, setSavedSearches }: UseSavedSearchesArgs) {
  // Saved searches: hydrate whenever the Discovery Preferences modal opens so
  // the list reflects the latest server state (save/delete both happen inside
  // that modal). Non-fatal on failure — the modal still works without it.
  useEffect(() => {
    if (!showDiscoveryPrefs) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/muse?type=saved-search-list");
        const d = await r.json();
        if (!cancelled) setSavedSearches(Array.isArray(d.searches) ? d.searches : []);
      } catch { if (!cancelled) setSavedSearches([]); }
    })();
    return () => { cancelled = true; };
  }, [showDiscoveryPrefs, apiFetch]);
}
