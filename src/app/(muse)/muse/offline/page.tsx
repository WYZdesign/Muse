"use client";

import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [clearing, setClearing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    navigator.serviceWorker?.getRegistration().then(reg => {
      if (!reg?.active) navigator.serviceWorker.register("/sw-muse.js");
    }).catch(() => {});
  }, []);

  async function clearAndReload() {
    if (clearing) return;
    setClearing(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      try { sessionStorage.clear(); } catch {}
      try { localStorage.removeItem("muse_user"); } catch {}
      setDone(true);
      setTimeout(() => window.location.assign("/muse"), 600);
    } catch {
      setClearing(false);
      window.location.assign("/muse");
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100dvh", padding: 32, background: "#0a0612", color: "#f5f0ff", textAlign: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📡</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You&apos;re offline</h1>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 340, marginBottom: 24 }}>
        Muse needs an internet connection to show content. Check your connection and try again.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: "12px 32px", borderRadius: 12, background: "#FFD700", color: "#0a0612", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Try Again
        </button>
        <button
          onClick={clearAndReload}
          disabled={clearing}
          style={{ padding: "12px 32px", borderRadius: 12, background: "rgba(255,255,255,0.08)", color: "#f5f0ff", border: "1px solid rgba(255,255,255,0.15)", fontSize: 14, fontWeight: 600, cursor: clearing ? "default" : "pointer", opacity: clearing ? 0.6 : 1 }}
        >
          {done ? "✓ Recovered — redirecting…" : clearing ? "Clearing…" : "Clear cache & reload"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", maxWidth: 340, marginTop: 24, lineHeight: 1.6 }}>
        Still seeing a blank screen? &ldquo;Clear cache &amp; reload&rdquo; resets the app and fixes stale-data issues.
      </p>
    </div>
  );
}
