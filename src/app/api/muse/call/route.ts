import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/http";
import { UUID_RE } from "@/lib/muse-actions/shared";

/**
 * Muse calls — LiveKit.
 *
 * Room names are deterministic (`muse-<sortedProfileIds>`) so both sides always
 * land in the same room without needing a shared "room id" handshake.
 *
 * Actions:
 *   start  → create the room (if needed), mint a token, notify + email the callee
 *   token  → mint a token for an existing room (callee accepting, or a rejoin)
 *   end    → close the room
 *
 * Requires LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET. Returns 503 with
 * a clear message if they're missing, so the UI can say so instead of hanging.
 */

const LK_URL = process.env.LIVEKIT_URL || "";
const LK_KEY = process.env.LIVEKIT_API_KEY || "";
const LK_SECRET = process.env.LIVEKIT_API_SECRET || "";

function configured() { return Boolean(LK_URL && LK_KEY && LK_SECRET); }
/** Server SDK needs an HTTP(S) URL; LIVEKIT_URL is the wss:// form. */
function httpUrl() { return LK_URL.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:"); }

function roomFor(a: string, b: string) {
  return `muse-${[String(a), String(b)].sort().join("__")}`;
}

async function authedProfile(req: NextRequest) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data.user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const { data: profile } = await getServiceClient()
    .from("muse_profiles").select("id, name, email, suspended").eq("auth_id", data.user.id).maybeSingle();
  if (!profile) return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  if ((profile as { suspended?: boolean }).suspended) {
    return { error: NextResponse.json({ error: "Account suspended" }, { status: 403 }) };
  }
  return { profile: profile as { id: string; name?: string; email?: string } };
}

async function mint(profile: { id: string; name?: string }, room: string) {
  const at = new AccessToken(LK_KEY, LK_SECRET, {
    identity: String(profile.id),
    name: profile.name || "Muse user",
    ttl: "2h",
  });
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
  return at.toJwt();
}

export async function POST(req: NextRequest) {
  try {
    if (!configured()) {
      return NextResponse.json({ error: "Calls are not configured yet" }, { status: 503 });
    }
    const auth = await authedProfile(req);
    if (auth.error) return auth.error;
    const profile = auth.profile!;

    const ip = clientIp(req);
    if (!await checkRate(ip, "call", 40)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const toId = String(body.toId || body.to_id || "");
    if (!UUID_RE.test(toId)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    if (toId === profile.id) return NextResponse.json({ error: "You can't call yourself" }, { status: 400 });

    // Blocked users can't call each other.
    const sb = getServiceClient();
    const { data: block } = await sb.from("muse_blocks").select("id")
      .or(`and(user_id.eq.${profile.id},target_id.eq.${toId}),and(user_id.eq.${toId},target_id.eq.${profile.id})`)
      .limit(1).maybeSingle();
    if (block) return NextResponse.json({ error: "Unable to call this user" }, { status: 403 });

    const room = roomFor(profile.id, toId);
    const kind = body.kind === "voice" ? "voice" : "video";

    if (action === "end") {
      try {
        const svc = new RoomServiceClient(httpUrl(), LK_KEY, LK_SECRET);
        await svc.deleteRoom(room);
      } catch { /* room may already be gone */ }
      return NextResponse.json({ success: true, room });
    }

    if (action === "start") {
      try {
        const svc = new RoomServiceClient(httpUrl(), LK_KEY, LK_SECRET);
        await svc.createRoom({ name: room, emptyTimeout: 60 * 3, maxParticipants: 2 });
      } catch (e) {
        // "already exists" is fine — a re-ring reuses the room.
        console.warn("[call] createRoom:", String(e).slice(0, 200));
      }
      const token = await mint(profile, room);

      // Notify the callee (in-app + email + push) so a missed ring isn't silent.
      try {
        await sb.from("muse_notifications").insert({
          user_id: toId,
          from_id: profile.id,
          type: "call",
          body: `${profile.name || "Someone"} is calling you`,
          read: false,
        });
      } catch { /* notification is best-effort */ }
      const { emailProfile } = await import("@/lib/muse-actions/shared").catch(() => ({ emailProfile: null as never }));
      if (emailProfile) {
        emailProfile(sb, toId, "Incoming Muse call", `${profile.name || "Someone"} is calling`, `${profile.name || "Someone"} is trying to reach you on Muse.`, "Answer", "https://muse.wyzdesign.com/muse", "call").catch(() => {});
      }

      return NextResponse.json({
        token,
        room,
        url: LK_URL,
        kind,
        from: { id: profile.id, name: profile.name || "Muse user" },
      });
    }

    if (action === "token") {
      const token = await mint(profile, room);
      return NextResponse.json({ token, room, url: LK_URL, kind });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return safeServerError(e, "call POST");
  }
}
