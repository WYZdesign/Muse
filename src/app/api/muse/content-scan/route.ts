import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { scanWithRekognition, logScan, reportIncident, escalateToNcmec } from "@/lib/contentScan";

// ═══ Content moderation endpoint ═══
// Thin delegate of the shared src/lib/contentScan.ts pipeline — no duplicated
// Rekognition logic here. Every other upload path (avatar/portfolio/album/chat/
// feed) scans through /api/muse/upload; this standalone route exists for any
// direct-scan caller (e.g. a future client-side pre-scan) and must stay in
// lock-step with the shared module.

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime"];

async function authedProfileId(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return null;
  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data.user) return null;
  const { data: profile } = await getServiceClient().from("muse_profiles").select("id").eq("auth_id", data.user.id).maybeSingle();
  return profile?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit — Rekognition is a paid API; prevent cost abuse.
    const ip = clientIp(req);
    if (!checkRate(ip, "content-scan", 20)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    // Authenticate — the userId must come from the token, never from form data
    // (a forged userId could attribute a scan/incident to an innocent account).
    const userId = await authedProfileId(req);
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const context = (formData.get("context") as string) || "upload";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ allowed: false, reason: "File too large (max 50MB)" }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ allowed: false, reason: "File type not allowed" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await scanWithRekognition(buffer);
    await logScan({ userId, fileName: file.name, fileType: file.type, fileSize: file.size, context, result });

    if (result.shouldBlock) {
      if (result.isCSAM) {
        await escalateToNcmec({ userId: userId || "unknown", context, fileName: file.name, result });
      } else if (result.shouldReport) {
        await reportIncident({ userId: userId || "unknown", context, result });
      }
      return NextResponse.json({ allowed: false, reason: "Content violates safety policies", flaggedCategories: result.flaggedCategories }, { status: 403 });
    }

    return NextResponse.json({ allowed: true, scanned: result.scanned, flaggedCategories: result.flaggedCategories.length > 0 ? result.flaggedCategories : undefined });
  } catch (error) {
    console.error("Content scan error:", error);
    // Fail-closed: a failed scan must NEVER allow content through (a fail-open
    // would let CSAM/nudity bypass moderation on a Rekognition outage).
    return NextResponse.json({ allowed: false, scanError: "Moderation unavailable — try again later" }, { status: 503 });
  }
}
