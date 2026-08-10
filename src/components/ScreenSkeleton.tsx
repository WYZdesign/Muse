"use client";

import React from "react";

interface Props {
  /** Number of placeholder items to render (default 3) */
  count?: number;
  /** Avatar shape variant: "circle" (default) or "square" */
  variant?: "circle" | "square";
  /** Height of each skeleton row (default 360 for cards, smaller for lists) */
  height?: number;
  inline?: boolean;
}

export function ScreenSkeleton({ count = 3, variant = "circle", height }: Props) {
  const style: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
  };

  const containerStyle: React.CSSProperties = {
    width: "100%", maxWidth: 360, borderRadius: 16,
    background: "rgba(255,255,255,0.03)", overflow: "hidden",
    height,
  };

  return (
    <div style={style}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={containerStyle}>
          <div className="skeleton-pulse" style={{ width: "100%", height: height ? height * 0.6 : 220, background: "rgba(255,255,255,0.04)" }} />
          <div style={{ padding: "12px 16px" }}>
            <div className="skeleton-pulse" style={{ width: "60%", height: 16, borderRadius: 8, marginBottom: 8, background: "rgba(255,255,255,0.06)" }} />
            <div className="skeleton-pulse" style={{ width: "40%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.04)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
          <div className="skeleton-pulse" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-pulse" style={{ width: "50%", height: 13, borderRadius: 6, marginBottom: 8, background: "rgba(255,255,255,0.06)" }} />
            <div className="skeleton-pulse" style={{ width: "80%", height: 11, borderRadius: 5, marginBottom: 4, background: "rgba(255,255,255,0.04)" }} />
            <div className="skeleton-pulse" style={{ width: "35%", height: 11, borderRadius: 5, background: "rgba(255,255,255,0.03)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", alignItems: "center" }}>
          <div className="skeleton-pulse" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-pulse" style={{ width: "45%", height: 13, borderRadius: 6, marginBottom: 6, background: "rgba(255,255,255,0.06)" }} />
            <div className="skeleton-pulse" style={{ width: "70%", height: 11, borderRadius: 5, background: "rgba(255,255,255,0.03)" }} />
          </div>
          <div className="skeleton-pulse" style={{ width: 32, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.04)" }} />
        </div>
      ))}
    </div>
  );
}
