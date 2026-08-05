import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (!lat || !lon) return NextResponse.json({ city: "" }, { status: 400 });

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "User-Agent": "MuseApp/1.0 (contact: info@wyzdesign.com)" } }
    );
    const j = await r.json();
    const city = j?.address?.city || j?.address?.town || j?.address?.state || j?.address?.country || "";
    return NextResponse.json({ city });
  } catch {
    return NextResponse.json({ city: "" });
  }
}