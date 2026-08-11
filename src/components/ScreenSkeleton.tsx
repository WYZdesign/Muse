"use client";

export default function ScreenSkeleton({ rows = 3, image = false }: { rows?: number; image?: boolean }) {
  return (
    <div className="skeleton-container" style={{ padding: "16px 20px 80px", gap: 12 }}>
      {image && <div className="skeleton-pulse" style={{ width: "100%", height: 220, borderRadius: 16 }} />}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton-pulse" style={{ height: 16, width: `${60 + Math.random() * 40}%`, borderRadius: 8 }} />
          <div className="skeleton-pulse" style={{ height: 12, width: "100%", borderRadius: 6 }} />
          <div className="skeleton-pulse" style={{ height: 12, width: "80%", borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}
