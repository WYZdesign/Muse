"use client";

import { useEffect } from "react";
import { SCREEN_TRIGGERED_TOUR_IDS, type TourScreenId } from "../components/pageTourContent";

/**
 * Per-page first-visit tour trigger, extracted verbatim from page.tsx. Same
 * bootstrap/auth guard, same 600ms delay, same [screen, bootstrapped, authUser,
 * maybeShowPageTour] deps.
 */
export type UsePageTourArgs = {
  screen: string;
  bootstrapped: boolean;
  authUser: unknown;
  maybeShowPageTour: (id: TourScreenId) => void;
};

export function usePageTour({ screen, bootstrapped, authUser, maybeShowPageTour }: UsePageTourArgs) {
  useEffect(() => {
    if (!bootstrapped || !authUser) return;
    if (!(SCREEN_TRIGGERED_TOUR_IDS as string[]).includes(screen)) return;
    const t = setTimeout(() => maybeShowPageTour(screen as TourScreenId), 600);
    return () => clearTimeout(t);
  }, [screen, bootstrapped, authUser, maybeShowPageTour]);
}
