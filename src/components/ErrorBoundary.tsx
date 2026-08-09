"use client";

import React from "react";

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Muse ErrorBoundary]", error, info.componentStack);
    try {
      fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: error.message, context: String(info.componentStack || "").slice(0, 2000) }),
      });
    } catch { /* silent */ }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100dvh", padding: 32, background: "#0a0612", color: "#f5f0ff", textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 400, marginBottom: 24 }}>
            Please refresh the page. If this keeps happening, contact support@wyzdesign.com.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 32px", borderRadius: 12, background: "#FFD700", color: "#0a0612",
              border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
