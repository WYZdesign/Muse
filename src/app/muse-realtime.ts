import { supabase } from "@/lib/supabase";
import { authFetch } from "@/app/(muse)/muse/lib/auth-client";
import { trackError } from "@/lib/errorTracker";

export type RealtimeMessage = {
  id?: string;
  convo_id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at?: string;
};

function convoIdFor(a: string, b: string): string {
  return [a, b].sort().join("__");
}

/**
 * Persist a chat message through the server API (which resolves the caller's
 * profile id from the Bearer token and stores sender_id in the profile
 * namespace — the same namespace export/delete-account expect). Returns true
 * on success. Returns false (never throws) when the message can't be written —
 * the UI keeps its local copy either way.
 */
export async function persistMessage(opts: {
  myId: string;
  theirId: string;
  text: string;
  img?: string;
  clientMsgId?: string;
}): Promise<boolean> {
  if (!opts.myId || opts.myId === "local") return false;
  if (!opts.theirId || (!opts.text.trim() && !opts.img)) return false;
  const convo = convoIdFor(opts.myId, opts.theirId);
  try {
    const res = await authFetch("/api/muse", {
      method: "POST",
      body: JSON.stringify({
        action: "message",
        match_id: convo,
        toId: opts.theirId,
        text: opts.text.trim().slice(0, 2000),
        img: opts.img || "",
        client_msg_id: opts.clientMsgId || `${opts.myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),
    });
    return res.ok;
  } catch (err) {
    trackError("persistMessage_failed", { convo, err: String(err) });
    return false;
  }
}

/**
 * Fetch the persisted history of a conversation from the server (muse_messages,
 * oldest-first). Used when a chat is opened so a returning user -- new device,
 * cleared storage, or a message that arrived while they weren't subscribed --
 * sees the real thread instead of only whatever happens to be in local state.
 * Never throws; returns [] on any failure so callers can just no-op on empty.
 */
export async function fetchConversationHistory(opts: {
  myId: string;
  theirId: string;
  limit?: number;
}): Promise<{ from: "me" | "them"; text: string; img?: string; time: string; clientMsgId?: string }[]> {
  if (!opts.myId || opts.myId === "local" || !opts.theirId) return [];
  const convo = convoIdFor(opts.myId, opts.theirId);
  try {
    const res = await authFetch(
      `/api/muse?type=messages&match_id=${encodeURIComponent(convo)}&limit=${opts.limit || 200}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rows = Array.isArray(data.messages) ? data.messages : [];
    return rows.map((r: any) => ({
      from: String(r.sender_id) === String(opts.myId) ? ("me" as const) : ("them" as const),
      text: r.text || "",
      img: r.img || undefined,
      time: r.created_at
        ? new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "",
      // Threaded through so callers can dedup against locally-held optimistic
      // messages by id instead of by text+img content — two distinct messages
      // sent close together with identical text shouldn't collapse into one.
      clientMsgId: r.client_msg_id || undefined,
    }));
  } catch (err) {
    trackError("fetchConversationHistory_failed", { convo, err: String(err) });
    return [];
  }
}

/**
 * Subscribe to realtime inserts on muse_messages for a conversation.
 * `onMessage` fires with the remote sender id + text. Returns an unsubscribe fn.
 */
export type RealtimeStatus = "connecting" | "connected" | "disconnected";

// Reconnect backoff schedule (ms) for a dropped/failed channel. A chat left
// open for a while shouldn't hammer Supabase, but should recover quickly
// from a brief network blip. Capped at 30s; retries indefinitely until
// unsubscribe() is called (component unmount / chat closed).
const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 20000, 30000];

export function subscribeToConversation(opts: {
  myId: string;
  theirId: string;
  onMessage: (senderId: string, text: string, img?: string) => void;
  onStatus?: (status: RealtimeStatus) => void;
  onTyping?: () => void;
}): { unsubscribe: () => void; sendTyping: () => void } {
  if (!opts.myId || opts.myId === "local") return { unsubscribe: () => {}, sendTyping: () => {} };
  const convo = convoIdFor(opts.myId, opts.theirId);

  let disposed = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  function teardown() {
    if (channel) {
      try { supabase.removeChannel(channel); } catch (err) {
        trackError("realtime_unsubscribe_failed", { convo, err: String(err) });
      }
      channel = null;
    }
  }

  function scheduleReconnect() {
    if (disposed || retryTimer) return;
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    attempt++;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (!disposed) connect();
    }, delay);
  }

  function connect() {
    teardown();
    // Fresh channel name per attempt — reusing a channel name Supabase has
    // already torn down after CHANNEL_ERROR/CLOSED can get stuck rejoining
    // the same broken state instead of establishing a clean connection.
    channel = supabase
      .channel(`muse-msg-${convo}-${Date.now()}-${attempt}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "muse_messages",
          filter: `match_id=eq.${convo}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          const sender = row.sender_id;
          const text = row.text;
          if (sender === opts.myId) return; // ignore our own echo
          opts.onMessage(sender, text, row.img || undefined);
        }
      )
      .on("broadcast", { event: "typing" }, () => {
        if (opts.onTyping) opts.onTyping();
      })
      .subscribe((status: string) => {
        // status: SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT | CLOSED
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          attempt = 0; // reset backoff once a connection actually succeeds
          opts.onStatus?.("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          opts.onStatus?.("disconnected");
          scheduleReconnect();
        }
      });
  }

  connect();

  return {
    unsubscribe: () => {
      disposed = true;
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      teardown();
    },
    sendTyping: () => {
      try { channel?.send({ type: "broadcast", event: "typing", payload: {} }); } catch (err) {
        trackError("realtime_typing_failed", { convo, err: String(err) });
      }
    },
  };
}

export type GeoResult = { lat: number; long: number; city: string; state: string; requiresIdVerification: boolean } | null;

/**
 * Request the browser's geolocation. Returns null on denial/timeout.
 * Always resolves (never throws) so callers can use it freely.
 */
export function getGeolocation(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const long = pos.coords.longitude;
        let city = "";
        let state = "";
        let requiresIdVerification = false;
        try {
          // Route geocoding through our own server endpoint (no direct
          // third-party browser calls — avoids CORS/rate-limit/privacy issues).
          const r = await fetch(`/api/geocode?lat=${lat}&lon=${long}`);
          if (r.ok) {
            const j = await r.json();
            city = j.city || "";
            state = j.state || "";
            requiresIdVerification = j.requiresIdVerification || false;
          }
        } catch (err) {
          trackError("reverse_geocode_failed", { err: String(err) });
        }
        resolve({ lat, long, city, state, requiresIdVerification });
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 600000 }
    );
  });
}

/** Haversine distance in miles between two lat/long points. */
export function distanceMiles(
  a: { lat: number; long: number },
  b: { lat: number; long: number }
): number {
  const R = 3958.8; // earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.long - a.long);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
