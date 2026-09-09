"use client";

// Unique Muse "Spark" like-button icon. A four-pointed shimmer star with a
// subtle inner sparkle, distinct from a generic ✦ or ✨. Rendered as pure SVG
// so it scales crisply at any size and inherits `currentColor` (so it picks up
// each page's accent via color). Used wherever a "like" affordance appears.
import React from "react";

export default function MuseSpark({
  size = 16,
  color = "currentColor",
  style,
  filled = true,
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={filled ? 0 : 1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {/* Four-pointed sparkle — outer star */}
      <path d="M12 2 C12.6 6.4 15.2 9.4 20 10 C15.2 10.6 12.6 13.6 12 18 C11.4 13.6 8.6 10.6 4 10 C8.6 9.4 11.4 6.4 12 2 Z" />
      {/* Inner glint */}
      <path d="M12 9 C12.35 10.7 13.3 11.65 15 12 C13.3 12.35 12.35 13.3 12 15 C11.65 13.3 10.7 12.35 9 12 C10.7 11.65 11.65 10.7 12 9 Z" fill={color} stroke="none" opacity={filled ? 0.55 : 0.9} />
    </svg>
  );
}
