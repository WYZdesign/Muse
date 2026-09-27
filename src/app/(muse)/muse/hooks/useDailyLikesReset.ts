"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * Daily like/super-like reset, extracted verbatim from page.tsx. Same 24h
 * window check and [setDailyLikes, setSuperLikes] deps.
 */
export type UseDailyLikesResetArgs = {
  safeGetItem: (key: string) => string | null;
  safeSetItem: (key: string, value: string) => boolean;
  setDailyLikes: Dispatch<SetStateAction<number>>;
  setSuperLikes: Dispatch<SetStateAction<number>>;
};

export function useDailyLikesReset({ safeGetItem, safeSetItem, setDailyLikes, setSuperLikes }: UseDailyLikesResetArgs) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const lastReset = safeGetItem("muse_last_reset");
      const now = Date.now();
      if (!lastReset || now - parseInt(lastReset) > 86400000) {
        setDailyLikes(10);
        setSuperLikes(3);
        safeSetItem("muse_last_reset", String(now));
      }
    }
  }, [setDailyLikes, setSuperLikes]);
}
