import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import QRCode from "qrcode";

// Local QR generation (qrcode npm package) — no external API dependency.
async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0a0612", light: "#ffffff" },
  });
}

export async function GET(req: NextRequest) {
  const sb = getServiceClient();
  const ip = clientIp(req);
  if (!await checkRate(ip, "qr", 120)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const url = req.nextUrl.searchParams.get("url");
  const source = req.nextUrl.searchParams.get("source") || "default";
  
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // SSRF prevention: validate URL format and block internal addresses
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only http/https URLs allowed" }, { status: 400 });
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("169.254.") || host.startsWith("10.") || host.startsWith("192.168.")) {
      return NextResponse.json({ error: "Internal URLs not allowed" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    // Track QR scan event
    await sb.from("muse_qr_events").insert({
      source,
      event_type: "scan",
      referrer: req.headers.get("referer") || null,
      user_agent: req.headers.get("user-agent") || null,
      ip_hash: Buffer.from(req.headers.get("x-forwarded-for") || "unknown").toString("base64").slice(0, 16),
      created_at: new Date().toISOString(),
    });

    // Generate QR code
    const qrSvg = await generateQrSvg(url);
    
    return new NextResponse(qrSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sb = getServiceClient();
  const ip = clientIp(req);
  if (!await checkRate(ip, "qr-post", 60)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const { url, source, action } = body;
  
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  // SSRF prevention: validate URL format and block internal addresses
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only http/https URLs allowed" }, { status: 400 });
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("169.254.") || host.startsWith("10.") || host.startsWith("192.168.")) {
      return NextResponse.json({ error: "Internal URLs not allowed" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    if (action === "share") {
      await sb.from("muse_qr_events").insert({
        source: source || "default",
        event_type: "share",
        referrer: req.headers.get("referer") || null,
        user_agent: req.headers.get("user-agent") || null,
        ip_hash: Buffer.from(req.headers.get("x-forwarded-for") || "unknown").toString("base64").slice(0, 16),
        created_at: new Date().toISOString(),
      });
    }

    const qrSvg = await generateQrSvg(url);
    
    return new NextResponse(qrSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}