"use client";

import { useEffect, useState } from "react";
import { authFetch, getAccessToken } from "@/app/(muse)/muse/lib/auth-client";

export default function VerifyReturnPage() {
  const [status, setStatus] = useState<"checking" | "verified" | "pending" | "error">("checking");
  const [message, setMessage] = useState("Checking your verification status…");

  useEffect(() => {
    let active = true;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (active) { setStatus("pending"); setMessage("You need to log in to confirm verification. Head back to Muse."); }
          return;
        }
        const res = await authFetch("/api/muse/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-verification-status" }),
        });
        const d = await res.json();
        if (d.status === "verified") {
          if (active) { setStatus("verified"); setMessage("You're verified! Redirecting back to Muse…"); }
          setTimeout(() => { if (active) window.location.href = "/muse"; }, 1500);
        } else if (attempts < 6) {
          if (active) { setStatus("checking"); setMessage("Still checking…"); }
          setTimeout(check, 3000);
        } else {
          if (active) { setStatus("pending"); setMessage("Verification didn't confirm yet. It may take a moment — or head back and check the status there."); }
        }
      } catch {
        if (active && attempts < 6) {
          setStatus("checking"); setMessage("Still checking…");
          setTimeout(check, 3000);
        } else if (active) {
          setStatus("error"); setMessage("Could not reach the verification service. Try again from the Muse app.");
        }
      }
    };

    check();
    return () => { active = false; };
  }, []);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0612", color: "#f5f0ff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 380, padding: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>
          {status === "verified" ? "✅" : status === "pending" ? "⏳" : status === "error" ? "⚠️" : "🪪"}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>
          {status === "verified" ? "Verification Complete" : "Muse Verification"}
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{message}</p>
        {status !== "verified" && (
          <button
            onClick={() => { window.location.href = "/muse"; }}
            style={{ marginTop: 24, padding: "12px 28px", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "none", color: "#f5f0ff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Back to Muse
          </button>
        )}
      </div>
    </div>
  );
}
