"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "../lib/auth-client";

export type RecKind = "voice" | "video";

/**
 * Shared voice/video clip recorder: MediaRecorder → upload → (optional) Whisper
 * transcript → callback. Extracted so Chat, Feed and any other composer get the
 * same behaviour — including the one-time consent gate, the 60s cap, and the
 * mic/camera cleanup on unmount.
 */
export function useRecorder(opts: {
  uploadMedia: (file: File, folder: string, kind: RecKind) => Promise<string | null>;
  onDone: (url: string, kind: RecKind, durationMs: number, mediaType: string, transcript?: string) => void;
  folder?: string;
  maxSeconds?: number;
  showToast?: (msg: string) => void;
}) {
  const { uploadMedia, onDone, folder = "chat", maxSeconds = 60, showToast } = opts;
  const [recording, setRecording] = useState<RecKind | null>(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const [sending, setSending] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentKind, setConsentKind] = useState<RecKind>("voice");

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const cancelRef = useRef(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => {
    try { mrRef.current?.stop(); } catch { /* already stopped */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const begin = useCallback(async (kind: RecKind) => {
    if (recording || sending) return;
    if (!uploadMedia) { showToast?.("Recording unavailable"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "voice" ? { audio: true } : { audio: true, video: { facingMode: "user", width: { ideal: 720 } } },
      );
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = kind === "voice" ? "audio/webm" : "video/webm";
      const mr = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mrRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const durationMs = Date.now() - startedAtRef.current;
        const type = mr.mimeType || mime;
        const blob = new Blob(chunksRef.current, { type });
        const cancelled = cancelRef.current;
        cancelRef.current = false;
        stopStream();
        setRecording(null);
        setRecordSecs(0);
        if (cancelled) return;
        if (durationMs < 700 || blob.size < 1200) { showToast?.("Too short — hold a little longer"); return; }
        setSending(true);
        showToast?.(kind === "voice" ? "Uploading voice note…" : "Uploading video note…");
        const file = new File([blob], `${kind}-${Date.now()}.webm`, { type });
        const url = await uploadMedia(file, folder, kind);
        if (!url) { setSending(false); return; }
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
          } catch { /* transcription is best-effort */ }
        }
        setSending(false);
        onDone(url, kind, durationMs, type, transcript);
      };

      startedAtRef.current = Date.now();
      mr.start();
      setRecording(kind);
      setRecordSecs(0);
      timerRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setRecordSecs(s);
        if (s >= maxSeconds) { try { mrRef.current?.stop(); } catch { /* noop */ } }
      }, 250);
    } catch {
      stopStream();
      setRecording(null);
      showToast?.(kind === "voice" ? "Microphone permission needed" : "Camera + microphone permission needed");
    }
  }, [recording, sending, uploadMedia, folder, maxSeconds, showToast, onDone, stopStream]);

  /** Entry point — shows the one-time consent notice before the first clip. */
  const start = useCallback(async (kind: RecKind) => {
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem("muse_rec_consent")) {
        setConsentKind(kind);
        setShowConsent(true);
        return;
      }
    } catch { /* localStorage unavailable */ }
    await begin(kind);
  }, [begin]);

  const acceptConsent = useCallback(() => {
    try { window.localStorage.setItem("muse_rec_consent", "1"); } catch { /* ignore */ }
    setShowConsent(false);
    void begin(consentKind);
  }, [begin, consentKind]);

  const stop = useCallback(() => { try { mrRef.current?.stop(); } catch { /* noop */ } }, []);
  const cancel = useCallback(() => { cancelRef.current = true; stop(); }, [stop]);
  const fmt = useCallback((ms?: number) => {
    if (!ms || ms < 0) return "";
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, []);

  return { recording, recordSecs, sending, showConsent, consentKind, setShowConsent, acceptConsent, start, stop, cancel, fmt };
}
