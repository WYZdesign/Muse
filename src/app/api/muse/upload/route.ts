import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { safeServerError } from "@/lib/http";
import { checkRateUser } from "@/lib/rate-limit";
import { scanWithRekognition, scanWithSightengine, logScan, reportIncident, escalateToNcmec } from "@/lib/contentScan";
import { demoModeUnavailable, isDemoMode } from "@/lib/demo-mode";

const ALLOWED_SIGNATURES: Record<string, { bytes: number[]; ext: string }> = {
  "89504e47": { bytes: [0x89,0x50,0x4E,0x47], ext: "png" },
  "ffd8": { bytes: [0xFF,0xD8], ext: "jpg" },
  "52494646": { bytes: [0x52,0x49,0x46,0x46], ext: "webp" },
  "47494638": { bytes: [0x47,0x49,0x46,0x38], ext: "gif" },
  // WebM (MediaRecorder output) — Matroska EBML header
  "1a45dfa3": { bytes: [0x1A,0x45,0xDF,0xA3], ext: "webm" },
};

function validateMagicBytes(buffer: Buffer): { valid: boolean; ext: string } {
  const hex = buffer.slice(0, 12).toString("hex");
  const match = ALLOWED_SIGNATURES[hex.slice(0, 8)]
    || ALLOWED_SIGNATURES[hex.slice(0, 4)]
    || ALLOWED_SIGNATURES[hex.slice(0, 6)];
  if (match) {
    for (let i = 0; i < match.bytes.length; i++) {
      if (buffer[i] !== match.bytes[i]) return { valid: false, ext: "" };
    }
    // RIFF container: bytes 8-11 must spell "WEBP" for a valid WebP file.
    if (match.ext === "webp" && buffer.slice(8, 12).toString("ascii") !== "WEBP") {
      return { valid: false, ext: "" };
    }
    return { valid: true, ext: match.ext };
  }
  return { valid: false, ext: "" };
}

function safeFilename(folder: string, ext: string): string {
  const uuid = crypto.randomUUID();
  return `${folder}/${uuid}.${ext}`;
}

async function authedProfileId(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return null;
  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data.user) return null;
  const { data: profile } = await getServiceClient().from("muse_profiles").select("id, suspended").eq("auth_id", data.user.id).maybeSingle();
  if (!profile) return null;
  if ((profile as any).suspended) return "__SUSPENDED__";
  return profile?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Uploads"), { status: 409 });
    const profileId = await authedProfileId(req);
    if (profileId === "__SUSPENDED__") return NextResponse.json({ error: "Account suspended", code: "ACCOUNT_SUSPENDED" }, { status: 403 });
    if (!profileId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // The caller is authenticated and resolved to a profile, so key this limit
    // to that profile rather than a forwarded IP header. This prevents a client
    // from changing a spoofable forwarding header to evade the quota and avoids
    // punishing unrelated creators behind the same NAT/mobile carrier.
    if (!await checkRateUser(profileId, "upload", 60)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "avatars";
    // Recorded clips arrive as WebM for both audio and video (MediaRecorder),
    // and the container header is identical, so the client tells us which it is.
    const mediaKind = (formData.get("mediaKind") as string) || "";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { valid, ext } = validateMagicBytes(buffer);
    if (!valid) return NextResponse.json({ error: "Invalid file type — only JPEG, PNG, WebP, GIF, WebM allowed" }, { status: 400 });
    const isAudio = ext === "webm" && mediaKind === "voice";
    const isVideo = ext === "webm" && !isAudio;
    if (file.size > (ext === "webm" ? 25 : 10) * 1024 * 1024) return NextResponse.json({ error: ext === "webm" ? "Clip too large (max 25MB)" : "File too large (max 10MB)" }, { status: 400 });

    // Rekognition's stored-video API requires an S3 object and this route has
    // neither a private quarantine nor a result-consumer/promotion pipeline.
    // Never persist a video that has not been safely moderated.
    if (isVideo) {
      return NextResponse.json({
        error: "Video uploads are temporarily unavailable while moderation is being completed",
        code: "VIDEO_UPLOAD_UNAVAILABLE",
      }, { status: 415 });
    }

    const blocklistedExts = ["svg","html","xml","js","php","exe","sh"];
    if (blocklistedExts.includes(file.name.toLowerCase().split(".").pop() || "")) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    // Compute the storage path BEFORE moderation so the scan log can carry the
    // final public URL — the admin review queue needs it to actually play the
    // flagged clip instead of just showing a filename.
    const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "avatars";
    const path = safeFilename(`${profileId}/${safeFolder}`, ext);
    const bucket = safeFolder === "album" ? "muse-private" : "muse-uploads";
    // Restricted album objects are represented by an internal locator. The
    // album endpoint authorizes the viewer before exchanging it for a signed URL.
    const storedUrl = bucket === "muse-private"
      ? `storage://${bucket}/${path}`
      : getServiceClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;

    // Content moderation — scan image uploads with AWS Rekognition before
    // storing. Video is rejected above until a quarantined moderation and
    // promotion pipeline exists.
    let autoNsfw = false;
    if (isAudio) {
      // Voice notes carry no visual content, so there is nothing for Rekognition
      // to scan — and crucially the video path below marks the uploader's profile
      // NSFW, which would be wrong for a voice note. Just record the upload.
      await logScan({
        userId: profileId,
        fileName: file.name,
        fileType: "audio/webm",
        fileSize: file.size,
        context: folder,
        result: { safe: true, scanned: true, flaggedCategories: [], confidence: 1, shouldBlock: false, shouldReport: false, isCSAM: false, details: [{ kind: "voice", url: storedUrl }] },
      });
    } else {
      // Two engines, merged: Rekognition (only one that asserts CSAM
      // categories) + Sightengine (much better explicit-content recall).
      // Block if EITHER says block; report if either says report.
      const [rek, sight] = await Promise.all([
        scanWithRekognition(buffer),
        scanWithSightengine(buffer, file.type || `image/${ext}`),
      ]);
      const scanResult = {
        safe: rek.safe && sight.safe,
        scanned: rek.scanned || sight.scanned,
        flaggedCategories: Array.from(new Set([...rek.flaggedCategories, ...sight.flaggedCategories])),
        confidence: Math.max(rek.confidence, sight.confidence),
        shouldBlock: rek.shouldBlock || sight.shouldBlock,
        shouldReport: rek.shouldReport || sight.shouldReport,
        isCSAM: rek.isCSAM,
        details: [...rek.details, ...sight.details],
      };
      await logScan({ userId: profileId, fileName: file.name, fileType: file.type || `image/${ext}`, fileSize: file.size, context: folder, result: scanResult });
      if (scanResult.shouldBlock) {
        if (scanResult.isCSAM) {
          await escalateToNcmec({ userId: profileId, context: folder, fileName: file.name, result: scanResult });
        } else if (scanResult.shouldReport) {
          await reportIncident({ userId: profileId, context: folder, result: scanResult });
        }
        const msg = scanResult.scanned ? "Content violates safety policies" : "Moderation unavailable — try again later";
        return NextResponse.json({ error: msg, flaggedCategories: scanResult.flaggedCategories }, { status: scanResult.scanned ? 403 : 503 });
      }

      // Auto-mark profile as NSFW when Rekognition flags suggestive content.
      // The Discover blur gates on profile.nsfw — without this, suggestive
      // uploads render unblurred because nothing ever sets that flag.
      if (scanResult.scanned && scanResult.flaggedCategories.some(c => /^suggestive/i.test(c))) {
        try {
          await getServiceClient().from("muse_profiles").update({ nsfw: true }).eq("id", profileId);
          autoNsfw = true;
        } catch (e) {
          console.error("[upload] failed to mark profile NSFW after suggestive scan:", e);
        }
      }
    }
    const sb = getServiceClient();
    const mimeExt = ext === "jpg" ? "jpeg" : ext;
    const { data, error } = await sb.storage.from(bucket).upload(path, buffer, {
      contentType: isAudio ? "audio/webm" : `image/${mimeExt}`,
      upsert: false,
    });

    if (error) return safeServerError(error, "upload POST");

    const url = bucket === "muse-private"
      ? `storage://${bucket}/${data.path}`
      : sb.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
    return NextResponse.json({ success: true, url, path: data.path, moderation: isAudio ? "audio" : "scanned", autoNsfw: autoNsfw || undefined });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Uploads"), { status: 409 });
    const profileId = await authedProfileId(req);
    if (profileId === "__SUSPENDED__") return NextResponse.json({ error: "Account suspended", code: "ACCOUNT_SUSPENDED" }, { status: 403 });
    if (!profileId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!await checkRateUser(profileId, "upload-delete", 60)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: "No path" }, { status: 400 });
    // Ownership gate: files are stored under {profileId}/ so only the uploader
    // may delete them. A path without the caller's profile prefix is rejected.
    if (!path.startsWith(`${profileId}/`)) return NextResponse.json({ error: "Not your file" }, { status: 403 });
    const sb = getServiceClient();
    const { error } = await sb.storage.from("muse-uploads").remove([path]);
    if (error) return safeServerError(error, "upload delete");
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return safeServerError(e, "upload");
  }
}
