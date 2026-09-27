"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { viewerSide } from "@/lib/role";

/**
 * Role-aware session-tab realignment, extracted verbatim from page.tsx. The
 * lazy sessTab initializer runs before the server profile arrives (type starts
 * as the "Photographer" placeholder), so this re-aligns once when the real type
 * lands — duality Phase 0's role-aware default. sessTypeRef moves with it (used
 * nowhere else). Same [currentUser?.type] dependency, expressed as the value.
 */
export type UseSessTabRealignArgs = {
  currentUserType: string | undefined;
  setSessTab: Dispatch<SetStateAction<"sessions" | "bookings" | "requests">>;
};

export function useSessTabRealign({ currentUserType, setSessTab }: UseSessTabRealignArgs) {
  const sessTypeRef = useRef(currentUserType);
  useEffect(() => {
    const t = currentUserType;
    if (t && t !== sessTypeRef.current) {
      sessTypeRef.current = t;
      setSessTab(viewerSide(t) === "industry" ? "bookings" : "sessions");
    }
  }, [currentUserType]);
}
