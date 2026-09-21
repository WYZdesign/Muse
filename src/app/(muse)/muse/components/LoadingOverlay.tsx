"use client";

/**
 * Full-screen loading overlay — gold spinner + message, Muse dark styling.
 * Used while Stripe's embedded components initialize and before external
 * redirects, so the UI never just "sits still" with no feedback.
 */
export default function LoadingOverlay({
  message = "Loading…",
  inline = false,
}: {
  message?: string;
  inline?: boolean;
}) {
  const body = (
    <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "3px solid rgba(255,215,0,0.18)",
          borderTopColor: "var(--gold, #ffd700)",
          animation: "muse-spin 0.8s linear infinite",
        }}
      />
      <div style={{ fontSize: 13, color: "var(--text2, #bfbacb)" }}>{message}</div>
      <style>{"@keyframes muse-spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );

  if (inline) {
    return <div style={{ padding: "48px 0" }}>{body}</div>;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5,3,10,0.82)",
        backdropFilter: "blur(3px)",
      }}
    >
      {body}
    </div>
  );
}
