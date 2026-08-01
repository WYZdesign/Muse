import { NextRequest, NextResponse } from "next/server";

// Reverse-geocode proxy. Browsers are NOT allowed to call Nominatim directly
// (CORS + usage policy), so the client hits this endpoint and we forward with
// a proper User-Agent. Applies Nominatim's 1 req/s policy + a 1-hour cache.

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/reverse";
const APP_UA = "WYZDesignMuse/1.0 (muse.wyzdesign.com; contact: wyz@wyzdesign.com)";
const CACHE_TTL_MS = 60 * 60 * 1000;
const MIN_UPSTREAM_GAP_MS = 1100;

const cache = new Map<string, { city: string; ts: number }>();
let lastUpstreamTs = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get("lat") || "");
  const long = parseFloat(searchParams.get("long") || "");

  if (isNaN(lat) || isNaN(long) || lat < -90 || lat > 90 || long < -180 || long > 180) {
    return NextResponse.json({ error: "Valid lat and long required" }, { status: 400 });
  }

  const key = `${lat.toFixed(4)},${long.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json({ city: hit.city, lat, long });
  }

  const wait = MIN_UPSTREAM_GAP_MS - (Date.now() - lastUpstreamTs);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastUpstreamTs = Date.now();

  try {
    const url = new URL(NOMINATIM_BASE);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(long));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": APP_UA, Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ city: "", lat, long });
    }

    const data = await res.json();
    const address = data.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      address.municipality ||
      "";
    cache.set(key, { city, ts: Date.now() });
    return NextResponse.json({ city, lat, long });
  } catch {
    return NextResponse.json({ city: "", lat, long });
  }
}

export const dynamic = "force-dynamic";
