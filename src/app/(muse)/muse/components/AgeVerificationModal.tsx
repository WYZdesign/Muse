"use client";

import { useEffect, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

type Props = {
  onVerified: () => void;
  onClose: () => void;
  purpose?: "general" | "age_gate";
  authFetch: (_url: string, _opts?: RequestInit) => Promise<Response>;
};

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export default function AgeVerificationModal({ onVerified, onClose, purpose = "age_gate", authFetch }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "starting" | "redirected" | "checking" | "verified" | "error" | "demo">("idle");
  const [message, setMessage] = useState("");
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);

  const startVerification = async () => {
    if (DEMO_MODE) {
      setState("demo");
      setMessage("Identity verification is unavailable in this demo. No document, selfie, booking, or payment action will be started.");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const action = purpose === "age_gate" ? "create-age-gate-session" : "create-verification-session";
      const res = await authFetch("/api/muse/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (d.required === false) {
        setState("verified");
        onVerified();
        return;
      }
      if (d.url) {
        setState("redirected");
        // Open Stripe's hosted verification page; user returns via return_url
        window.open(d.url, "_blank");
        setMessage("Verification opened in a new tab. Complete it, then return here.");
      } else if (d.clientSecret) {
        setState("redirected");
        setMessage("Verification started. Please wait...");
      } else {
        setState("error");
        setMessage(d.error || "Could not start verification");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  };

  const checkStatus = async () => {
    if (DEMO_MODE) {
      setState("demo");
      setMessage("Identity verification is unavailable in this demo. No document, selfie, booking, or payment action will be started.");
      return;
    }
    setState("checking");
    try {
      const res = await authFetch("/api/muse/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-verification-status" }),
      });
      const d = await res.json();
      if (d.status === "verified") {
        setState("verified");
        onVerified();
      } else if (d.status === "pending" || d.status === "requires_input") {
        setState("redirected");
        setMessage("Not verified yet. Complete the verification in the other tab, then check again.");
      } else {
        setState("redirected");
        setMessage(`Status: ${d.status}. Complete verification and try again.`);
      }
    } catch {
      setState("error");
      setMessage("Could not check status. Try again.");
    }
  };

  // When returning from Stripe (URL contains a verification fragment), auto-check.
  // Stripe's return_url uses QUERY params (session_id=...), not a hash fragment —
  // the old hash check never fired, so users had to click "Check Status"
  // manually. Now we check both hash AND query params.
  useEffect(() => {
    if (typeof window === "undefined" || state !== "idle") return;
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const hasSessionFragment = hash.includes("session") || search.includes("session_id=") || search.includes("session=");
    if (hasSessionFragment) {
      checkStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={trapRef} role="dialog" aria-modal="true" aria-label="Age verification" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)" }}>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--gold)", borderRadius: 24, padding: 32, maxWidth: 440, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🪪</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
          {state === "verified" ? "Verified!" : "Age Verification for Paid Bookings"}
        </h2>

        {state === "verified" ? (
          <p style={{ fontSize: 14, color: "#3a9e3a", marginBottom: 20 }}>Your identity has been verified. You're all set for paid bookings.</p>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.6 }}>
            Paid bookings require an 18+ identity check administered by Stripe Identity. Stripe processes the government ID and selfie needed for that check; Muse receives the verification status needed to apply booking eligibility. See the Privacy Policy for details.
          </p>
        )}

        {state === "error" && <p style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 14 }}>{message}</p>}
        {state === "demo" && <p style={{ fontSize: 12, color: "var(--gold)", marginBottom: 14 }}>{message}</p>}
        {state === "redirected" && <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>{message}</p>}
        {state === "checking" && <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Checking verification status…</p>}
        {state === "loading" && <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Starting secure verification…</p>}

        <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          {state === "idle" && (
            <button
              onClick={startVerification}
              style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Verify Now
            </button>
          )}
          {state === "redirected" && (
            <>
              <button
                onClick={startVerification}
                style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Reopen Verification
              </button>
              <button
                onClick={checkStatus}
                style={{ width: "100%", padding: "12px 0", borderRadius: 14, background: "var(--surface-hover)", border: "none", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                I Completed Verification — Check Status
              </button>
            </>
          )}
          {(state === "error" || state === "loading") && (
            <button
              onClick={startVerification}
              style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "none", color: "#0a0612", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Try Again
            </button>
          )}
          {state !== "verified" && (
            <button onClick={onClose} style={{ minHeight: 44, padding: "8px 0", background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}>
              Not now
            </button>
          )}
        </div>

        <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 16, lineHeight: 1.5 }}>
          Verification is provided by Stripe Identity. Verification status is not shown to other members. Review the Privacy Policy for information about processing and retention.
        </p>
      </div>
    </div>
  );
}
