"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0612", color: "#f5f0ff", textAlign: "center", padding: 32, fontFamily: "system-ui, sans-serif" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 400, marginBottom: 24 }}>Please refresh the page. If this keeps happening, contact support@wyzdesign.com.</p>
          <button onClick={() => reset()} style={{ padding: "12px 32px", borderRadius: 12, background: "#FFD700", color: "#0a0612", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
