import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIp } from "@/lib/rate-limit";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@wyzdesign.com";

export async function GET(req: NextRequest) {
  // Nominatim requires ≤1 req/sec — rate limit to avoid IP ban.
  const ip = clientIp(req);
  if (!checkRate(ip, "geocode", 45)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (!lat || !lon) return NextResponse.json({ city: "" }, { status: 400 });

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "User-Agent": `MuseApp/1.0 (contact: ${CONTACT_EMAIL})` } }
    );
    const j = await r.json();
    const city = j?.address?.city || j?.address?.town || j?.address?.state || j?.address?.country || "";
    return NextResponse.json({ city });
  } catch {
    return NextResponse.json({ city: "" });
  }
}