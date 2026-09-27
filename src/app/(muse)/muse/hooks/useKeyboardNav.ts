"use client";

import { useEffect } from "react";

/**
 * Discover keyboard navigation, extracted verbatim from page.tsx. Called after
 * useSwipeActions so `doSwipe` is in scope. Same [screen, doSwipe] deps.
 */
export type UseKeyboardNavArgs = {
  screen: string;
  doSwipe: (dir: "left" | "right", intentOverride?: string) => void;
};

export function useKeyboardNav({ screen, doSwipe }: UseKeyboardNavArgs) {
  useEffect(() => { if(screen!=="discover")return;const onKey=(e:KeyboardEvent)=>{if(e.key==="ArrowLeft"){e.preventDefault();doSwipe("left")}if(e.key==="ArrowRight"){e.preventDefault();doSwipe("right")}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[screen,doSwipe]);
}
