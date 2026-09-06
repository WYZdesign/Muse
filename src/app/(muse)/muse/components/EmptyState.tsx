"use client";

import React from "react";

// Shared empty-state presentational component. The app previously mixed rich
// (icon+title+sub+CTA) and terse (single flat line) empty states with no shared
// component. Standardize on one affordance so a screen's "nothing here" state
// reads consistently everywhere.
export function EmptyState({
  icon,
  title,
  sub,
  children,
  style,
}: {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="empty-state" style={{ textAlign: "center", paddingTop: 48, paddingBottom: 24, ...style }}>
      {icon && <div className="empty-icon" style={{ fontSize: 46, marginBottom: 12 }}>{icon}</div>}
      <div className="empty-title" style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>{title}</div>
      {sub && <div className="empty-sub" style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, maxWidth: 280, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>{sub}</div>}
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
