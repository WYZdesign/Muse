"use client";

// Reusable horizontal-scroll carousel that REPLACES the blocky browser
// scrollbar with hidden scrollbars + subtle ‹ › arrow buttons that nudge the
// row. The arrows live OUTSIDE the scrolling element (siblings, absolutely
// positioned against the non-scrolling wrapper) so they stay put while the row
// scrolls underneath — they never drift with the content. No bubble, no fades.
import React, { useRef, useState, useCallback, useEffect } from "react";

export default function HScroll({
  children,
  className = "",
  gap = 8,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setCanLeft(left);
    setCanRight(right);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.55), behavior: "smooth" });
  };

  return (
    <div className="hsc-wrap" style={{ position: "relative" }}>
      <button className={"hsc-arrow left" + (canLeft ? "" : " hidden")} aria-label="Scroll left" tabIndex={-1} onClick={() => nudge(-1)}>‹</button>
      <div
        ref={ref}
        className={"hsc-fade " + className}
        onScroll={update}
        style={{ display: "flex", gap, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", ...style }}
      >
        {children}
      </div>
      <button className={"hsc-arrow right" + (canRight ? "" : " hidden")} aria-label="Scroll right" tabIndex={-1} onClick={() => nudge(1)}>›</button>
    </div>
  );
}
