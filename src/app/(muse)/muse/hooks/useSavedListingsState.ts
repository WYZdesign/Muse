"use client";
import { useState } from "react";

/**
 * Save/bookmark state for Sessions and Professionals — same shape and same
 * server-persisted pattern as useBriefsState's savedBriefs (an id array kept
 * in muse_profiles.preferences via the save-preferences action), extended to
 * the other two listing types that had no save affordance at all.
 */
export function useSavedListingsState() {
  const [savedSessionIds, setSavedSessionIds] = useState<(string | number)[]>([]);
  const [savedProfileIds, setSavedProfileIds] = useState<(string | number)[]>([]);

  return {
    savedSessionIds, setSavedSessionIds,
    savedProfileIds, setSavedProfileIds,
  };
}
