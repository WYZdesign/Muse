"use client";

import { useEffect, useState } from "react";

type Props = {
  onVerified: () => void;
  onClose: () => void;
  purpose?: "general" | "age_gate";
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
};

export default function AgeVerificationModal({ onVerified, onClose, purpose = "age_gate", authFetch }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "starting" | "redirected" | "checking" | "verified" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checkCount, setCheckCount] = useState(0);

  const startVerification = async () => {
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
        setCheckCount(c => c + 1);
      } else {
        setState("redirected");
        setMessage(`Status: ${d.status}. Complete verification and try again.`);
        setCheckCount(c => c + 1);
      }
    } catch {
      setState("error");
      setMessage("Could not check status. Try again.");
    }
  };

  // When returning from Stripe (URL contains a verification fragment), auto-check
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash?.includes("session") && state === "idle") {
      checkStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,6,18,0.95)" }}>
      <div style={{ background: "#1a0a2e", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 24, padding: 32, maxWidth: 440, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🪪</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f5f0ff", marginBottom: 10 }}>
          {state === "verified" ? "Verified!" : "Age Verification Required"}
        </h2>

        {state === "verified" ? (
          <p style={{ fontSize: 14, color: "#98FB98", marginBottom: 20 }}>Your identity has been verified. You're all set for paid bookings.</p>
        ) : (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 20, lineHeight: 1.6 }}>
            Paid bookings require government ID + selfie verification (18+ only). This is a one-time check via Stripe Identity — secure, encrypted, and never shared with other members.
          </p>
        )}

        {state === "error" && <p style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 14 }}>{message}</p>}
        {state === "redirected" && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>{message}</p>}
        {state === "checking" && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>Checking verification status…</p>}
        {state === "loading" && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>Starting secure verification…</p>}

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
                style={{ width: "100%", padding: "12px 0", borderRadius: 14, background: "rgba(255,255,255,0.1)", border: "none", color: "#f5f0ff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
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
            <button onClick={onClose} style={{ padding: "8px 0", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
              Not now
            </button>
          )}
        </div>

        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 16, lineHeight: 1.5 }}>
          Verification is provided by Stripe Identity. Your documents are encrypted and never stored on Muse servers. You can verify or skip at any time — paid bookings require it.
        </p>
      </div>
    </div>
  );
}
