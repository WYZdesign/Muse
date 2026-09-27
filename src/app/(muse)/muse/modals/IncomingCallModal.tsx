"use client";

import type { MuseModalsProps } from "./types";

type Props = Pick<MuseModalsProps, "incomingCall" | "activeCall" | "declineCall" | "acceptCall">;

export function IncomingCallModal({ incomingCall, activeCall, declineCall, acceptCall }: Props) {
  if (!incomingCall || activeCall) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Incoming call" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(5,3,10,0.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <div style={{ width: 104, height: 104, borderRadius: "50%", background: "linear-gradient(135deg,#ffd700,#d4a5ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 800, color: "#0a0612" }}>
        {(incomingCall.fromName || "?").slice(0, 1).toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#f5f0ff" }}>{incomingCall.fromName}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
        Incoming {incomingCall.kind === "voice" ? "voice" : "video"} call
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
        <button onClick={declineCall} style={{ width: 66, height: 66, borderRadius: "50%", border: "none", background: "#ff3b30", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Decline</button>
        <button onClick={acceptCall} style={{ width: 66, height: 66, borderRadius: "50%", border: "none", background: "#34c759", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Accept</button>
      </div>
    </div>
  );
}
