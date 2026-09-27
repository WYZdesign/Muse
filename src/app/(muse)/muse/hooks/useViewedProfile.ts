"use client";

import { useEffect, useState } from "react";
import type { ProfileReview } from "../page-models";

/**
 * Viewed-profile side effects, extracted verbatim from page.tsx: resetting the
 * photo carousel index when a new profile opens, and loading that profile's
 * reviews. Both key off `viewProfile?.id`; the reviews fetch keeps its original
 * cancelled-flag cleanup. The carousel-reset effect originally sat before the
 * review fetch's declaration site; it now runs beside it (still within the same
 * first commit and still keyed on the same id), which is behaviour-neutral.
 */
export type UseViewedProfileArgs = {
  viewProfileId: string | number | undefined | null;
  fetchWithTimeout: (url: string, init?: RequestInit) => Promise<Response>;
};

export function useViewedProfile({
  viewProfileId,
  fetchWithTimeout,
}: UseViewedProfileArgs) {
  const [viewProfilePhotoIdx, setViewProfilePhotoIdx] = useState(0);
  const [viewProfileReviews, setViewProfileReviews] = useState<ProfileReview[]>([]);

  // Reset photo carousel when a new profile is opened
  useEffect(() => { setViewProfilePhotoIdx(0); }, [viewProfileId]);

  // Load a profile's reviews when the profile modal opens (reviews are
  // written via submit-review but were previously never read back).
  useEffect(() => {
    if (!viewProfileId) { setViewProfileReviews([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout(`/api/muse?type=reviews&profile_id=${encodeURIComponent(viewProfileId)}`);
        const d = await res.json();
        if (!cancelled) setViewProfileReviews(d.reviews || []);
      } catch { if (!cancelled) setViewProfileReviews([]); }
    })();
    return () => { cancelled = true; };
  }, [viewProfileId]);

  return { viewProfilePhotoIdx, setViewProfilePhotoIdx, viewProfileReviews, setViewProfileReviews };
}
