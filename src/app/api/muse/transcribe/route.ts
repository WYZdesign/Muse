import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/http";
import { demoModeUnavailable, isDemoMode } from "@/lib/demo-mode";

/**
 * Transcribe a recorded voice note.
 *
 * Uses Groq's Whisper endpoint (fast + cheap). Deliberately graceful: if
 * GROQ_API_KEY isn't configured the route returns 503 and the voice note still
 * sends — it just won't carry a transcript. Nothing here is required for the
 * clip itself to work.
 *
 * Accepts multipart audio (the same WebM blob the client just uploaded) and
 * returns { transcript }.
 */
export async function POST(req: NextRequest) {
  try {
    if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Transcription"), { status: 409 });
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "transcription_not_configured" }, { status: 503 });
    }

    // Auth: same bearer-token pattern as /api/muse/upload.
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!bearer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { data: authData, error: authErr } = await supabase.auth.getUser(bearer);
    if (authErr || !authData.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { data: profile } = await getServiceClient()
      .from("muse_profiles").select("id, suspended").eq("auth_id", authData.user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if ((profile as { suspended?: boolean }).suspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const ip = clientIp(req);
    if (!await checkRate(ip, "transcribe", 30)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Clip too large" }, { status: 400 });

    const upstream = new FormData();
    upstream.append("file", file, file.name || "voice.webm");
    upstream.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo");
    upstream.append("response_format", "json");

    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.error("[transcribe] groq failed:", r.status, body.slice(0, 300));
      return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
    }
    const data = await r.json().catch(() => ({}));
    const transcript = typeof data.text === "string" ? data.text.trim().slice(0, 2000) : "";
    return NextResponse.json({ transcript });
  } catch (e: unknown) {
    return safeServerError(e, "transcribe POST");
  }
}
