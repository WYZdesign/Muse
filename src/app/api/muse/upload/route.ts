import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const ALLOWED_SIGNATURES: Record<string, { bytes: number[]; ext: string }> = {
  "89504e47": { bytes: [0x89,0x50,0x4E,0x47], ext: "png" },
  "ffd8": { bytes: [0xFF,0xD8], ext: "jpg" },
  "52494646": { bytes: [0x52,0x49,0x46,0x46], ext: "webp" },
  "47494638": { bytes: [0x47,0x49,0x46,0x38], ext: "gif" },
};

function validateMagicBytes(buffer: Buffer): { valid: boolean; ext: string } {
  const hex = buffer.slice(0, 4).toString("hex");
  const match = ALLOWED_SIGNATURES[hex.slice(0, 8)]
    || ALLOWED_SIGNATURES[hex.slice(0, 4)]
    || ALLOWED_SIGNATURES[hex.slice(0, 6)];
  if (match) {
    for (let i = 0; i < match.bytes.length; i++) {
      if (buffer[i] !== match.bytes[i]) return { valid: false, ext: "" };
    }
    return { valid: true, ext: match.ext };
  }
  return { valid: false, ext: "" };
}

function safeFilename(folder: string, ext: string): string {
  const uuid = crypto.randomUUID();
  return `${folder}/${uuid}.${ext}`;
}

export async function POST(req: NextRequest) {
  try {
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

    const path = safeFilename(folder, ext);
    const sb = getServiceClient();
    const { data, error } = await sb.storage.from("muse-uploads").upload(path, buffer, {
      contentType: `image/${ext}`,
      upsert: false,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: urlData } = sb.storage.from("muse-uploads").getPublicUrl(data.path);
    return NextResponse.json({ success: true, url: urlData.publicUrl, path: data.path });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: "No path" }, { status: 400 });
    const sb = getServiceClient();
    const { error } = await sb.storage.from("muse-uploads").remove([path]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
