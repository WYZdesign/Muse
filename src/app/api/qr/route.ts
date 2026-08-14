import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRate, clientIp } from "@/lib/rate-limit";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Simple QR code generator using a free API or generate SVG
// For production, you'd use a library like 'qrcode' or a service
async function generateQrSvg(url: string): Promise<string> {
  // Use a simple QR code service or generate inline
  // This is a placeholder - in production use qrcode npm package
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&format=svg&margin=10&color=0a0612&bgcolor=ffffff`;
  
  try {
    const res = await fetch(qrApiUrl);
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // Fallback to simple SVG
  }
  
  // Fallback: simple SVG placeholder
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <rect width="300" height="300" fill="white"/>
    <text x="150" y="150" text-anchor="middle" font-family="monospace" font-size="12" fill="#0a0612">QR: ${url}</text>
  </svg>`;
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRate(ip, "qr", 120)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const url = req.nextUrl.searchParams.get("url");
  const source = req.nextUrl.searchParams.get("source") || "default";
  
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
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
  const { url, source, action } = await req.json();
  
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
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