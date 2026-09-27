"use client";

import { useEffect, useState } from "react";

/**
 * Story auto-advance, extracted verbatim from page.tsx: 5s per story, then next
 * (or close at the end). Same guard, same [showStory, stories.length] deps.
 */
export type UseStoryAutoAdvanceArgs = {
  stories: ReadonlyArray<unknown>;
};

export function useStoryAutoAdvance({ stories }: UseStoryAutoAdvanceArgs) {
  const [showStory, setShowStory] = useState<number | null>(null);

  // Story auto-advance: 5s per story, then next (or close at the end)
  useEffect(() => {
    if (showStory === null) return;
    const timer = setTimeout(() => {
      setShowStory(prev => (prev !== null && prev < stories.length - 1) ? prev + 1 : null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showStory, stories.length]);

  return { showStory, setShowStory };
}
