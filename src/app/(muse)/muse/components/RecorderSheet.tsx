"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiX, FiSquare, FiSend, FiRefreshCw } from "react-icons/fi";
import { authFetch } from "../lib/auth-client";
import { useFocusTrap } from "../hooks/useFocusTrap";

export type RecKind = "voice" | "video";

/**
 * Full recording experience for voice/video clips:
 *   1. record  — live self-preview (video) + timer, Stop to finish
 *   2. preview — play the clip back, then Send / Record again / Cancel
 *   3. upload  — progress, then hands the URL to the caller
 *
 * The previous inline bar recorded blind (no self-view) and auto-sent on stop,
 * so you couldn't see yourself or check the clip before it went out.
 */
export default function RecorderSheet({
  kind,
  folder = "chat",
  onCancel,
  onSent,
  uploadMedia,
  maxSeconds = 60,
}: {
  kind: RecKind;
  folder?: string;
  onCancel: () => void;
  onSent: (url: string, kind: RecKind, durationMs: number, mediaType: string, transcript?: string) => void;
  uploadMedia: (file: File, folder: string, kind: RecKind) => Promise<string | null>;
  maxSeconds?: number;
}) {
  const [phase, setPhase] = useState<"recording" | "preview" | "uploading">("recording");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clipUrl, setClipUrl] = useState<string>("");
  const [clipBlob, setClipBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  // Bumping this re-runs the start effect (used by "Redo" without a page reload).
  const [nonce, setNonce] = useState(0);

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const sheetRef = useFocusTrap<HTMLDivElement>(true, onCancel);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stop = useCallback(() => {
    try { mrRef.current?.stop(); } catch { /* already stopped */ }
  }, []);

  // Start on mount.
  useEffect(() => {
    let mounted = true;
    cancelledRef.current = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          kind === "voice"
            ? { audio: true }
            : { audio: true, video: { facingMode: "user", width: { ideal: 720 } } },
        );
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        // Live self-preview (video only) — mirrored, muted.
        if (kind === "video" && previewRef.current) {
          previewRef.current.srcObject = stream;
          previewRef.current.play().catch(() => {});
        }
        chunksRef.current = [];
        const mime = kind === "voice" ? "audio/webm" : "video/webm";
        const mr = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        mrRef.current = mr;
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
        mr.onstop = () => {
          const dur = Date.now() - startedAtRef.current;
          const type = mr.mimeType || mime;
          const blob = new Blob(chunksRef.current, { type });
          cleanup();
          if (cancelledRef.current) return;
          if (dur < 600 || blob.size < 800) {
            setError("Too short — hold a little longer");
            setPhase("preview");
            return;
          }
          setClipBlob(blob);
          setClipUrl(URL.createObjectURL(blob));
          setDurationMs(dur);
          setPhase("preview");
        };
        startedAtRef.current = Date.now();
        mr.start();
        setPhase("recording");
        setSeconds(0);
        timerRef.current = window.setInterval(() => {
          const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
          setSeconds(s);
          if (s >= maxSeconds) stop();
        }, 250);
      } catch {
        if (mounted) setError(kind === "voice" ? "Microphone permission needed" : "Camera + microphone permission needed");
      }
    })();
    return () => {
      mounted = false;
      cancelledRef.current = true;
      try { mrRef.current?.stop(); } catch { /* noop */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, nonce]);

  const send = async () => {
    if (!clipBlob) return;
    setPhase("uploading");
    setError(null);
    const type = clipBlob.type || (kind === "voice" ? "audio/webm" : "video/webm");
    const file = new File([clipBlob], `${kind}-${Date.now()}.webm`, { type });
    const url = await uploadMedia(file, folder, kind);
    if (!url) { setError("Upload failed — try again"); setPhase("preview"); return; }
    // Best-effort transcript for voice notes.
    let transcript: string | undefined;
    if (kind === "voice") {
      try {
        const fd = new FormData();
        fd.append("file", file, file.name);
        const tr = await authFetch("/api/muse/transcribe", { method: "POST", body: fd, timeoutMs: 60000 });
        if (tr.ok) {
          const tj = await tr.json();
          transcript = typeof tj.transcript === "string" && tj.transcript.trim() ? tj.transcript.trim() : undefined;
        }
      } catch { /* optional */ }
    }
    onSent(url, kind, durationMs, type, transcript);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={`${kind === "voice" ? "Voice" : "Video"} note recorder`} style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(5,3,10,0.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
            {kind === "voice" ? "🎤 Voice note" : "🎥 Video note"}
          </div>
          <button onClick={onCancel} aria-label="Cancel recording" style={{ width: 44, height: 44, background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><FiX size={22} /></button>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: "#2a1216", color: "#ff8a80", fontSize: 12 }}>{error}</div>
        )}

        {/* Live self-preview while recording (video) */}
        {kind === "video" && phase === "recording" && (
          <video ref={previewRef} autoPlay playsInline muted
            style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 18, background: "#0f0a1a", transform: "scaleX(-1)" }} />
        )}

        {/* Playback of the recorded clip before sending */}
        {phase !== "recording" && clipUrl && (
          kind === "video" ? (
            <video src={clipUrl} controls playsInline style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 18, background: "#0f0a1a" }} />
          ) : (
            <div style={{ padding: 20, borderRadius: 18, background: "#141020", border: "1px solid rgba(255,255,255,0.1)" }}>
              <audio src={clipUrl} controls style={{ width: "100%" }} />
            </div>
          )
        )}

        {kind === "voice" && phase === "recording" && (
          <div style={{ padding: 28, borderRadius: 18, background: "#141020", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎤</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#ffd700", fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Recording… tap Stop when you&apos;re done</div>
          </div>
        )}

        {phase === "recording" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff3b30" }} />
            <span style={{ fontSize: 13, color: "#fff", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>/ {String(Math.floor(maxSeconds / 60)).padStart(2, "0")}:{String(maxSeconds % 60).padStart(2, "0")}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {phase === "recording" && (
            <>
              <button onClick={onCancel} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={stop} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: "#ffd700", color: "#0a0612", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <FiSquare size={14} /> Stop
              </button>
            </>
          )}

          {phase === "preview" && (
            <>
              <button onClick={onCancel} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { setClipBlob(null); setClipUrl(""); setError(null); setNonce((n) => n + 1); }}
                aria-label="Record again"
                style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "transparent", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <FiRefreshCw size={14} /> Redo
              </button>
              <button onClick={send} disabled={!clipBlob}
                style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: clipBlob ? "#ffd700" : "rgba(255,215,0,0.3)", color: "#0a0612", fontSize: 14, fontWeight: 800, cursor: clipBlob ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <FiSend size={14} /> Send
              </button>
            </>
          )}

          {phase === "uploading" && (
            <div style={{ flex: 1, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
              {kind === "voice" ? "Uploading + transcribing…" : "Uploading…"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
