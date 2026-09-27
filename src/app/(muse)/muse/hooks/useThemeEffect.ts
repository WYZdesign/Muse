"use client";

import { useEffect } from "react";

/**
 * Applies the persisted theme to the document root. Extracted verbatim from
 * page.tsx's theme useEffect: same dependency ([theme]) and same body, so the
 * attribute write still happens at the same point in the effect order.
 */
export type UseThemeEffectArgs = {
  theme: string;
};

export function useThemeEffect({ theme }: UseThemeEffectArgs) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // Persistence is handled by saveState (theme is part of its payload) —
    // no separate read-modify-write here to avoid a lost-update race on muse_v1.
  }, [theme]);
}
