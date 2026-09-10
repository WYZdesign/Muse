"use client";

// Reusable horizontal-scroll carousel that REPLACES the blocky browser
// scrollbar with hidden scrollbars + subtle ‹ › arrow buttons that nudge the
// row. Arrows are vertically centered on the row, have no bubble/background,
// and only appear when the row actually overflows in that direction. No edge
// fades or shadows. Used for filter-tab rows across the app.
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
    <div className={`hsc-wrap ${className}`} style={{ position: "relative", ...style }}>
      <button className={"hsc-arrow left" + (canLeft ? "" : " hidden")} aria-label="Scroll left" tabIndex={-1} onClick={() => nudge(-1)}>‹</button>
      <div
        ref={ref}
        className="hsc-fade"
        onScroll={update}
        style={{ display: "flex", gap, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", padding: "2px 0" }}
      >
        {children}
      </div>
      <button className={"hsc-arrow right" + (canRight ? "" : " hidden")} aria-label="Scroll right" tabIndex={-1} onClick={() => nudge(1)}>›</button>
    </div>
  );
}
