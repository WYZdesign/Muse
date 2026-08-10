"use client";

import { useEffect, useRef } from "react";

/**
 * Preloads the hero images for the next 2 cards in the swipe stack.
 * Uses <link rel="preload"> to hint the browser to fetch images early,
 * reducing visible pop-in on fast swipes.
 */
export function CardPreloader({ currentIdx, profiles }: {
  currentIdx: number;
  profiles: any[];
}) {
  const preloaded = useRef(new Set<string>());

  useEffect(() => {
    if (!profiles.length) return;
    const nextImages: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const idx = currentIdx + i;
      if (idx >= profiles.length) break;
      const p = profiles[idx];
      if (p?.img) nextImages.push(p.img);
    }

    for (const src of nextImages) {
      if (preloaded.current.has(src)) continue;
      preloaded.current.add(src);
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      link.setAttribute("fetchpriority", "low");
      document.head.appendChild(link);
    }

    return () => {
      if (preloaded.current.size > 20) preloaded.current.clear();
    };
  }, [currentIdx, profiles]);

  return null;
}
