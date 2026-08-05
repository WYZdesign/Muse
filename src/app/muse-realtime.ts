import { supabase } from "@/lib/supabase";
import { authFetch } from "@/app/(muse)/muse/lib/auth-client";

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
  } catch {
    return false;
  }
}

/**
 * Subscribe to realtime inserts on muse_messages for a conversation.
 * `onMessage` fires with the remote sender id + text. Returns an unsubscribe fn.
 */
export function subscribeToConversation(opts: {
  myId: string;
  theirId: string;
  onMessage: (senderId: string, text: string) => void;
}): () => void {
  if (!opts.myId || opts.myId === "local") return () => {};
  const convo = convoIdFor(opts.myId, opts.theirId);
  const channel = supabase
    .channel("muse-msg-" + convo)
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
        opts.onMessage(sender, text);
      }
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}

export type GeoResult = { lat: number; long: number; city: string } | null;

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
        try {
          // Route geocoding through our own server endpoint (no direct
          // third-party browser calls — avoids CORS/rate-limit/privacy issues).
          const r = await fetch(`/api/geocode?lat=${lat}&long=${long}`);
          if (r.ok) {
            const j = await r.json();
            city = j.city || "";
          }
        } catch {}
        resolve({ lat, long, city });
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
