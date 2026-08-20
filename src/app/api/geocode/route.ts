import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIp } from "@/lib/rate-limit";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@wyzdesign.com";

// U.S. states that legally require government-issued ID verification for
// adult/NSFW content (not just a self-reported age checkbox).
const AGE_VERIFICATION_STATES = new Set([
  "Texas", "Louisiana", "Arkansas", "Utah",
]);

export async function GET(req: NextRequest) {
  // Nominatim requires ≤1 req/sec — rate limit to avoid IP ban.
  const ip = clientIp(req);
  if (!await checkRate(ip, "geocode", 45)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (!lat || !lon) return NextResponse.json({ city: "", state: "", requiresIdVerification: false }, { status: 400 });

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "User-Agent": `MuseApp/1.0 (contact: ${CONTACT_EMAIL})` } }
    );
    const j = await r.json();
    const city = j?.address?.city || j?.address?.town || "";
    const state = j?.address?.state || "";
    const requiresIdVerification = AGE_VERIFICATION_STATES.has(state);

    return NextResponse.json({ city, state, requiresIdVerification });
  } catch {
    return NextResponse.json({ city: "", state: "", requiresIdVerification: false });
  }
}