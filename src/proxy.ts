import { NextRequest, NextResponse } from "next/server";
import { getMuseUrl } from "@/lib/urls";

const MUSE_URL = getMuseUrl();
const WYZDESIGN_URL = "https://www.wyzdesign.com";

const ALLOWED_ORIGINS = [
  MUSE_URL,
  WYZDESIGN_URL,
  WYZDESIGN_URL.replace("www.", ""),
];

function originAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/muse-.+\.vercel\.app$/.test(origin)) return true;
  if (origin.endsWith("-wyzdesigns-projects.vercel.app")) return true;
  if (process.env.NODE_ENV === "development" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin") || "";
    const referer = request.headers.get("referer") || "";
    if (!originAllowed(origin) && !originAllowed(referer.split("/").slice(0, 3).join("/"))) {
      return NextResponse.json({ error: "Forbidden — cross-origin request blocked" }, { status: 403 });
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }
}

export const config = { matcher: "/api/:path*" };
