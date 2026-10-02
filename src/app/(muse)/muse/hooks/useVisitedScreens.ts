"use client";

import { useRef } from "react";

/**
 * Lazy-mount-on-first-visit, then keep-alive.
 *
 * Every screen renders its own `.screen-el` wrapper, which muse.css hides with
 * `display:none!important` unless it also carries `.active`. That meant every
 * screen was mounted on every load — running its effects, holding its state and
 * leaving ghost landmarks/focusable nodes in the DOM — even screens the user
 * never opened. This tracks which screens have ever been active so page.tsx can
 * render each screen only after its first visit while keeping it mounted
 * afterwards. A visited-but-inactive screen stays hidden by exactly the same
 * CSS as before, so its scroll/state is preserved byte-for-byte; a screen that
 * was never visited simply isn't in the DOM.
 *
 * The current screen is added during render (not in an effect) because
 * hydration restores a persisted screen only after the first hydrated paint
 * (loadState() is fire-and-forget inside useBootstrapHydration), so an effect
 * would leave one empty frame between the initial screen and the restored one.
 * The write is idempotent and only ever grows the set, so it is safe under
 * StrictMode double-render. The set is seeded with the initial screen so the
 * very first paint always has a screen to show.
 */
export function useVisitedScreens<T extends string>(screen: T): Set<T> {
  const ref = useRef<Set<T> | null>(null);
  if (ref.current === null) ref.current = new Set<T>([screen]);
  const visited = ref.current;
  visited.add(screen);
  return visited;
}
