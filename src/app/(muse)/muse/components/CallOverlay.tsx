"use client";

import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiFlag, FiVoicemail, FiSquare } from "react-icons/fi";
import type { ActiveCall } from "../hooks/useCall";
import { useRecorder } from "../hooks/useRecorder";

/**
 * Full-screen call overlay. Connects to the LiveKit room, renders the remote
 * participant full-bleed with a local picture-in-picture, and exposes the
 * expected controls (mute, camera, end) plus a report action for safety.
 *
 * When it's an outgoing call that nobody has picked up yet, a "Leave voicemail"
 * action appears — records a voice note and drops it into the conversation.
 */
export default function CallOverlay({
  call,
  onEnd,
  onReport,
  onVoicemail,
  uploadMedia,
}: {
  call: NonNullable<ActiveCall>;
  onEnd: () => void;
  onReport?: () => void;
  onVoicemail?: (url: string, durationMs: number, transcript?: string) => void;
  uploadMedia?: (file: File, folder: string, kind: "voice" | "video") => Promise<string | null>;
}) {
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const [status, setStatus] = useState("Connecting…");
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(call.kind === "video");
  const [remotePresent, setRemotePresent] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Voicemail — only offered on an outgoing call nobody has answered.
  const rec = useRecorder({
    uploadMedia: uploadMedia || (async () => null),
    folder: "voicemail",
    showToast: () => {},
    onDone: (url, _kind, durationMs, _mediaType, transcript) => { onVoicemail?.(url, durationMs, transcript); },
  });
  const canVoicemail = Boolean(call.outgoing && !remotePresent && onVoicemail && uploadMedia);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attach = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
        setRemotePresent(true);
      } else if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
        setRemotePresent(true);
      }
    };

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => attach(track))
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => track.detach())
      .on(RoomEvent.ParticipantConnected, () => setRemotePresent(true))
      .on(RoomEvent.ParticipantDisconnected, () => setRemotePresent(false))
      .on(RoomEvent.Disconnected, () => { if (!cancelled) onEndRef.current(); })
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.track && pub.track.kind === Track.Kind.Video && localVideoRef.current) {
          pub.track.attach(localVideoRef.current);
        }
      });

    (async () => {
      try {
        await room.connect(call.url, call.token);
        if (cancelled) return;
        setConnected(true);
        setStatus("Connected");
        await room.localParticipant.setMicrophoneEnabled(true);
        if (call.kind === "video") {
          await room.localParticipant.setCameraEnabled(true);
          room.localParticipant.trackPublications.forEach((pub) => {
            if (pub.track && pub.track.kind === Track.Kind.Video && localVideoRef.current) {
              pub.track.attach(localVideoRef.current);
            }
          });
        }
        room.remoteParticipants.forEach((p: RemoteParticipant) => {
          p.trackPublications.forEach((pub: RemoteTrackPublication) => {
            if (pub.track) attach(pub.track);
          });
        });
      } catch {
        if (!cancelled) setStatus("Could not connect");
      }
    })();

    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
      try { room.disconnect(); } catch { /* already disconnected */ }
      roomRef.current = null;
    };
  }, [call.url, call.token, call.kind]);

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    setMicOn(next);
    try { await room.localParticipant.setMicrophoneEnabled(next); } catch { setMicOn(!next); }
  };

  const toggleCam = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    setCamOn(next);
    try { await room.localParticipant.setCameraEnabled(next); } catch { setCamOn(!next); }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "#05030a", display: "flex", flexDirection: "column" }}>
      {/* Remote view */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover", background: "#05030a", display: remotePresent && call.kind === "video" ? "block" : "none" }} />
        <audio ref={remoteAudioRef} autoPlay />

        {(!remotePresent || call.kind === "voice") && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", padding: 24 }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#ffd700,#d4a5ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: "#0a0612" }}>
              {(call.peerName || "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f5f0ff" }}>{call.peerName}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              {connected ? (remotePresent ? `On the call · ${mm}:${ss}` : "Waiting for them to join…") : status}
            </div>
          </div>
        )}

        {remotePresent && call.kind === "video" && (
          <div style={{ position: "absolute", top: 16, left: 0, right: 0, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 6px rgba(0,0,0,.8)" }}>
            {call.peerName} · {mm}:{ss}
          </div>
        )}

        {/* Local PiP */}
        {call.kind === "video" && (
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position: "absolute", bottom: 16, right: 16, width: 108, height: 152, objectFit: "cover", borderRadius: 14, border: "1.5px solid rgba(255,255,255,0.25)", background: "#0f0a1a", transform: "scaleX(-1)" }} />
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: "18px 20px calc(26px + env(safe-area-inset-bottom,0px))", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, background: "#0a0612" }}>
        <button onClick={toggleMic} aria-label={micOn ? "Mute" : "Unmute"} style={{ width: 54, height: 54, borderRadius: "50%", border: "none", background: micOn ? "rgba(255,255,255,0.12)" : "#ff6b6b", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {micOn ? <FiMic size={22} /> : <FiMicOff size={22} />}
        </button>
        {call.kind === "video" && (
          <button onClick={toggleCam} aria-label={camOn ? "Turn camera off" : "Turn camera on"} style={{ width: 54, height: 54, borderRadius: "50%", border: "none", background: camOn ? "rgba(255,255,255,0.12)" : "#ff6b6b", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {camOn ? <FiVideo size={22} /> : <FiVideoOff size={22} />}
          </button>
        )}
        {onReport && (
          <button onClick={onReport} aria-label="Report this call" style={{ width: 54, height: 54, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FiFlag size={20} />
          </button>
        )}
        {canVoicemail && (
          <button
            onClick={() => (rec.recording ? rec.stop() : rec.start("voice"))}
            disabled={rec.sending}
            aria-label={rec.recording ? "Stop and send voicemail" : "Leave voicemail"}
            style={{ width: 54, height: 54, borderRadius: "50%", border: "none", background: rec.recording ? "#ff3b30" : "rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {rec.recording ? <FiSquare size={20} /> : <FiVoicemail size={20} />}
          </button>
        )}
        <button onClick={onEnd} aria-label="End call" style={{ width: 64, height: 64, borderRadius: "50%", border: "none", background: "#ff3b30", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FiPhoneOff size={26} />
        </button>
      </div>

      {canVoicemail && (
        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.45)", paddingBottom: "calc(14px + env(safe-area-inset-bottom,0px))", background: "#0a0612" }}>
          {rec.recording
            ? `Recording voicemail · ${rec.fmt(rec.recordSecs * 1000)} — tap the square to send`
            : "No answer? Tap the voicemail icon to leave a voice message."}
        </div>
      )}
    </div>
  );
}
