import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { safeServerError } from "@/lib/http";
import { checkRate, clientIp } from "@/lib/rate-limit";

const ALLOWED_SIGNATURES: Record<string, { bytes: number[]; ext: string }> = {
  "89504e47": { bytes: [0x89,0x50,0x4E,0x47], ext: "png" },
  "ffd8": { bytes: [0xFF,0xD8], ext: "jpg" },
  "52494646": { bytes: [0x52,0x49,0x46,0x46], ext: "webp" },
  "47494638": { bytes: [0x47,0x49,0x46,0x38], ext: "gif" },
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
  const { data: profile } = await getServiceClient().from("muse_profiles").select("id").eq("auth_id", data.user.id).maybeSingle();
  return profile?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const profileId = await authedProfileId(req);
    if (!profileId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Rate limit uploads per user (generous: 60/min for normal photo workflow)
    const ip = clientIp(req);
    if (!checkRate(ip, "upload", 60)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "avatars";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { valid, ext } = validateMagicBytes(buffer);
    if (!valid) return NextResponse.json({ error: "Invalid file type — only JPEG, PNG, WebP, GIF allowed" }, { status: 400 });

    const blocklistedExts = ["svg","html","xml","js","php","exe","sh"];
    if (blocklistedExts.includes(file.name.toLowerCase().split(".").pop() || "")) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "avatars";
    const path = safeFilename(`${profileId}/${safeFolder}`, ext);
    const sb = getServiceClient();
    const { data, error } = await sb.storage.from("muse-uploads").upload(path, buffer, {
      contentType: `image/${ext}`,
      upsert: false,
    });

    if (error) return safeServerError(error, "upload POST");

    const { data: urlData } = sb.storage.from("muse-uploads").getPublicUrl(data.path);
    return NextResponse.json({ success: true, url: urlData.publicUrl, path: data.path });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const profileId = await authedProfileId(req);
    if (!profileId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

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
