"use client";
import React from "react";

interface State { hasError: boolean; error: Error | null }

export class ScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; name?: string },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: React.ErrorInfo) {
    console.error(`[ScreenBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error.message);
    // Fire-and-forget server log so we can see crash rates in production
    fetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "track-error",
        context: this.props.name || "unknown",
        message: error.message,
        stack: error.stack?.slice(0, 500),
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 14 }}>
          <div style={{ fontSize: 36 }}>😵</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Something went wrong</div>
          <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", maxWidth: 280 }}>
            This screen hit an unexpected error. Your data is safe.
          </div>
          <button
            className="btn btn-gold"
            style={{ padding: "10px 28px", borderRadius: 99, fontSize: 13 }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
