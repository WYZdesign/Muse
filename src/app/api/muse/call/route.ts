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
      // Close out the log row: duration is measured client-side (answered → end).
      const endedId = String(body.callId || body.call_id || "");
      if (UUID_RE.test(endedId)) {
        const durationMs = Number.isFinite(Number(body.duration_ms)) ? Math.max(0, Math.round(Number(body.duration_ms))) : null;
        await sb.from("muse_calls").update({
          status: "ended",
          ended_at: new Date().toISOString(),
          duration_ms: durationMs,
        }).eq("id", endedId);
      }
      return NextResponse.json({ success: true, room });
    }

    if (action === "start") {
      // Age gate: Muse carries NSFW content, so nobody unverified gets on a
      // call. Verification is valid for 150 days (see isAgeVerificationCurrent).
      try {
        const { data: both } = await sb.from("muse_profiles")
          .select("id, age_verified, age_verified_at")
          .in("id", [profile.id, toId]);
        const cutoff = Date.now() - 150 * 24 * 60 * 60 * 1000;
        const stale = (both || []).filter((p: { age_verified?: boolean; age_verified_at?: string }) =>
          !p.age_verified || !p.age_verified_at || new Date(p.age_verified_at).getTime() < cutoff);
        if (stale.length) {
          const mine = stale.some((p: { id: string }) => String(p.id) === String(profile.id));
          return NextResponse.json({
            error: mine ? "Verify your age before calling" : "They need to verify their age before calls",
            code: "AGE_VERIFICATION_REQUIRED",
          }, { status: 403 });
        }
      } catch { /* if the check itself fails, don't block the call */ }

      // Busy: someone already ringing/on a call in the last 5 minutes.
      try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: busy } = await sb.from("muse_calls")
          .select("id, caller_id")
          .eq("callee_id", toId)
          .in("status", ["ringing", "answered"])
          .gte("started_at", fiveMinAgo)
          .limit(1).maybeSingle();
        if (busy) {
          return NextResponse.json({ error: "They're on another call right now", code: "BUSY" }, { status: 409 });
        }
      } catch { /* best-effort */ }

      try {
        const svc = new RoomServiceClient(httpUrl(), LK_KEY, LK_SECRET);
        await svc.createRoom({ name: room, emptyTimeout: 60 * 3, maxParticipants: 2 });
      } catch (e) {
        // "already exists" is fine — a re-ring reuses the room.
        console.warn("[call] createRoom:", String(e).slice(0, 200));
      }
      const token = await mint(profile, room);

      // Call log row — the source of truth for history + missed calls.
      let callId: string | null = null;
      try {
        const { data: row } = await sb.from("muse_calls").insert({
          caller_id: profile.id,
          callee_id: toId,
          kind,
          status: "ringing",
          room,
        }).select("id").single();
        callId = row?.id ?? null;
      } catch { /* log is best-effort; the call still proceeds */ }

      // Notify the callee (in-app + push + email) so a missed ring isn't silent.
      try {
        await sb.from("muse_notifications").insert({
          user_id: toId,
          from_id: profile.id,
          type: "call",
          body: `${profile.name || "Someone"} is calling you`,
          read: false,
        });
      } catch { /* best-effort */ }
      try {
        const { pushToProfile } = await import("@/lib/push");
        pushToProfile(
          toId,
          `${kind === "voice" ? "Voice" : "Video"} call`,
          `${profile.name || "Someone"} is calling you on Muse`,
          "/muse/matches",
        ).catch(() => {});
        const { emailProfile } = await import("@/lib/muse-actions/shared");
        emailProfile(sb, toId, "Incoming Muse call", `${profile.name || "Someone"} is calling`, `${profile.name || "Someone"} is trying to reach you on Muse.`, "Answer", "https://muse.wyzdesign.com/muse", "call").catch(() => {});
      } catch { /* notifications are best-effort */ }

      return NextResponse.json({
        token,
        room,
        url: LK_URL,
        kind,
        callId,
        from: { id: profile.id, name: profile.name || "Muse user" },
      });
    }

    // ── Lifecycle updates on the call log ──
    const callId = String(body.callId || body.call_id || "");
    if (action === "answer" || action === "decline" || action === "missed" || action === "voicemail") {
      if (!UUID_RE.test(callId)) return NextResponse.json({ error: "Invalid callId" }, { status: 400 });

      if (action === "voicemail") {
        const url = typeof body.voicemail_url === "string" ? body.voicemail_url : "";
        const durationMs = Number.isFinite(Number(body.duration_ms)) ? Math.max(0, Math.round(Number(body.duration_ms))) : null;
        const transcript = typeof body.transcript === "string" && body.transcript.trim() ? body.transcript.slice(0, 2000) : null;
        await sb.from("muse_calls").update({
          status: "voicemail",
          ended_at: new Date().toISOString(),
          voicemail_url: url || null,
          voicemail_duration_ms: durationMs,
          voicemail_transcript: transcript,
        }).eq("id", callId).eq("caller_id", profile.id);
        // Drop the voicemail into the conversation so it's not lost in a log.
        if (url) {
          const matchId = [profile.id, toId].sort().join("__");
          await sb.from("muse_messages").insert({
            match_id: matchId,
            sender_id: profile.id,
            receiver_id: toId,
            text: "",
            img: "",
            kind: "voice",
            media_url: url,
            media_type: "audio/webm",
            duration_ms: durationMs,
            transcript,
          }).then(() => {}, () => {});
          await sb.from("muse_notifications").insert({
            user_id: toId, from_id: profile.id, type: "voicemail",
            body: `${profile.name || "Someone"} left you a voicemail`, read: false,
          }).then(() => {}, () => {});
        }
        return NextResponse.json({ success: true });
      }

      const patch: Record<string, unknown> = { status: action === "missed" ? "missed" : action };
      if (action === "answer") patch.answered_at = new Date().toISOString();
      if (action === "decline") patch.ended_at = new Date().toISOString();
      await sb.from("muse_calls").update(patch).eq("id", callId);
      return NextResponse.json({ success: true });
    }

    if (action === "history") {
      const { data: rows } = await sb.from("muse_calls")
        .select("id, caller_id, callee_id, kind, status, started_at, answered_at, ended_at, duration_ms, voicemail_url, voicemail_duration_ms, voicemail_transcript")
        .or(`caller_id.eq.${profile.id},callee_id.eq.${profile.id}`)
        .order("created_at", { ascending: false })
        .limit(50);
      return NextResponse.json({ success: true, calls: rows || [] });
    }

    // ═══ COMMUNITY VOICE ROOM (group call) ═══
    // One shared room per community: anyone who is a member can join, and the
    // room name is derived from the community id so everyone lands together.
    if (action === "start-room") {
      const communityId = String(body.communityId || body.community_id || "");
      if (!UUID_RE.test(communityId)) return NextResponse.json({ error: "Invalid community" }, { status: 400 });

      const { data: membership } = await sb.from("muse_community_members")
        .select("id").eq("community_id", communityId).eq("user_id", profile.id).maybeSingle();
      if (!membership) return NextResponse.json({ error: "Join the community to enter its voice room" }, { status: 403 });

      const { data: community } = await sb.from("muse_communities")
        .select("id, name, is_nsfw").eq("id", communityId).maybeSingle();
      if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

      // Age gate applies here too.
      const { data: me } = await sb.from("muse_profiles")
        .select("age_verified, age_verified_at").eq("id", profile.id).maybeSingle();
      const cutoff = Date.now() - 150 * 24 * 60 * 60 * 1000;
      if (!me?.age_verified || !me?.age_verified_at || new Date(me.age_verified_at).getTime() < cutoff) {
        return NextResponse.json({ error: "Verify your age before joining voice rooms", code: "AGE_VERIFICATION_REQUIRED" }, { status: 403 });
      }

      const groupRoom = `muse-community-${communityId}`;
      try {
        const svc = new RoomServiceClient(httpUrl(), LK_KEY, LK_SECRET);
        await svc.createRoom({ name: groupRoom, emptyTimeout: 60 * 10, maxParticipants: 20 });
      } catch { /* already exists is fine */ }

      const token = await mint(profile, groupRoom);
      return NextResponse.json({
        token, room: groupRoom, url: LK_URL, kind: "voice",
        community: { id: community.id, name: community.name },
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
