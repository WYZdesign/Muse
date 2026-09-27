"use client";

import { useEffect } from "react";

/**
 * Debounced state save, extracted verbatim from page.tsx: a 4s timer that calls
 * saveState whenever its identity changes. Same cleanup and [saveState] dep.
 */
export type UseSaveStateTimerArgs = {
  saveState: () => void;
};

export function useSaveStateTimer({ saveState }: UseSaveStateTimerArgs) {
  useEffect(() => { const t = setTimeout(saveState, 4000); return () => clearTimeout(t); }, [saveState]);
}
