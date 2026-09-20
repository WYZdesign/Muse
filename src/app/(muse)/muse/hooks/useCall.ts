"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authFetch } from "../lib/auth-client";

export type CallKind = "voice" | "video";

export type IncomingCall = {
  fromId: string;
  fromName: string;
  room: string;
  kind: CallKind;
  callId?: string | null;
} | null;

export type ActiveCall = {
  room: string;
  url: string;
  token: string;
  kind: CallKind;
  peerId: string;
  peerName: string;
  outgoing: boolean;
  callId?: string | null;
  startedAt: number;
} | null;

/**
 * Muse calls — LiveKit rooms + ringing over a shared Supabase broadcast channel.
 *
 * All clients subscribe to one channel (`muse-calls`) and filter on the payload's
 * `to` field, which avoids per-user channel setup and works the moment a user is
 * online. Room names are deterministic server-side, so accept/rejoin need no
 * extra handshake beyond the peer id.
 */
export function useCall(myId: string | null | undefined) {
  const [incoming, setIncoming] = useState<IncomingCall>(null);
  const [active, setActive] = useState<ActiveCall>(null);
  const [error, setError] = useState<string | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activeRef = useRef<ActiveCall>(null);

  useEffect(() => { activeRef.current = active; }, [active]);

  const send = useCallback((event: string, payload: Record<string, unknown>) => {
    try { chanRef.current?.send({ type: "broadcast", event, payload }); } catch { /* channel not ready */ }
  }, []);

  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel("muse-calls", { config: { broadcast: { self: false } } });

    ch.on("broadcast", { event: "ring" }, ({ payload }: { payload: any }) => {
      if (!payload || String(payload.to) !== String(myId)) return;
      // Don't stack a second ring over an active call.
      if (activeRef.current) return;
      setIncoming({
        fromId: String(payload.from),
        fromName: String(payload.fromName || "Someone"),
        room: String(payload.room || ""),
        kind: payload.kind === "voice" ? "voice" : "video",
        callId: payload.callId ? String(payload.callId) : null,
      });
    });

    ch.on("broadcast", { event: "accept" }, ({ payload }: { payload: any }) => {
      if (!payload || String(payload.to) !== String(myId)) return;
      setError(null);
    });

    ch.on("broadcast", { event: "decline" }, ({ payload }: { payload: any }) => {
      if (!payload || String(payload.to) !== String(myId)) return;
      setActive((a) => (a && a.outgoing ? null : a));
      setError("Call declined");
    });

    ch.on("broadcast", { event: "end" }, ({ payload }: { payload: any }) => {
      if (!payload || String(payload.to) !== String(myId)) return;
      setActive(null);
      setIncoming(null);
    });

    ch.subscribe();
    chanRef.current = ch;
    return () => {
      try { supabase.removeChannel(ch); } catch { /* already gone */ }
      chanRef.current = null;
    };
  }, [myId]);

  const callApi = useCallback(async (action: string, toId: string, kind: CallKind, extra?: Record<string, unknown>) => {
    const r = await authFetch("/api/muse/call", {
      method: "POST",
      body: JSON.stringify({ action, toId, kind, ...(extra || {}) }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Call failed");
    return d;
  }, []);

  const startCall = useCallback(async (peerId: string, peerName: string, kind: CallKind) => {
    if (!myId || !peerId) return;
    setError(null);
    try {
      const d = await callApi("start", peerId, kind);
      setActive({ room: d.room, url: d.url, token: d.token, kind, peerId, peerName, outgoing: true, callId: d.callId || null, startedAt: Date.now() });
      send("ring", { to: peerId, from: myId, fromName: d.from?.name || "", room: d.room, kind, callId: d.callId || "" });
    } catch (e: unknown) {
      setError((e as Error)?.message || "Could not start the call");
    }
  }, [myId, callApi, send]);

  const acceptCall = useCallback(async () => {
    const inc = incoming;
    if (!inc || !myId) return;
    setError(null);
    try {
      const d = await callApi("token", inc.fromId, inc.kind, { callId: inc.callId });
      setActive({ room: d.room, url: d.url, token: d.token, kind: inc.kind, peerId: inc.fromId, peerName: inc.fromName, outgoing: false, callId: inc.callId || null, startedAt: Date.now() });
      send("accept", { to: inc.fromId, from: myId, room: d.room });
      if (inc.callId) callApi("answer", inc.fromId, inc.kind, { callId: inc.callId }).catch(() => {});
      setIncoming(null);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Could not join the call");
      send("decline", { to: inc.fromId, from: myId });
      if (inc.callId) callApi("decline", inc.fromId, inc.kind, { callId: inc.callId }).catch(() => {});
      setIncoming(null);
    }
  }, [incoming, myId, callApi, send]);

  const declineCall = useCallback(() => {
    const inc = incoming;
    if (inc && myId) {
      send("decline", { to: inc.fromId, from: myId });
      if (inc.callId) callApi("decline", inc.fromId, inc.kind, { callId: inc.callId }).catch(() => {});
    }
    setIncoming(null);
  }, [incoming, myId, send, callApi]);

  const endCall = useCallback(async () => {
    const a = activeRef.current;
    setActive(null);
    if (!a || !myId) return;
    const durationMs = a.startedAt ? Date.now() - a.startedAt : undefined;
    send("end", { to: a.peerId, from: myId, room: a.room });
    try { await callApi("end", a.peerId, a.kind, { callId: a.callId, duration_ms: durationMs }); } catch { /* room may already be gone */ }
  }, [myId, callApi, send]);

  /** Leave a voicemail instead of ringing out (caller side). */
  const leaveVoicemail = useCallback(async (url: string, durationMs: number, transcript?: string) => {
    const a = activeRef.current;
    setActive(null);
    if (!a || !myId) return;
    send("end", { to: a.peerId, from: myId, room: a.room });
    try {
      await callApi("voicemail", a.peerId, a.kind, { callId: a.callId, voicemail_url: url, duration_ms: durationMs, transcript });
    } catch { /* fall through — the clip is still in the chat if it saved */ }
  }, [myId, callApi, send]);

  const fetchHistory = useCallback(async (peerId: string) => {
    if (!myId || !peerId) return [];
    try {
      const d = await callApi("history", peerId, "voice");
      return Array.isArray(d.calls) ? d.calls : [];
    } catch { return []; }
  }, [myId, callApi]);

  return { incoming, active, error, setError, startCall, acceptCall, declineCall, endCall, leaveVoicemail, fetchHistory };
}
