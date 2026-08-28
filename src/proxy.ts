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
  // Allow all vercel preview deployments
  if (/^https:\/\/muse-.+\.vercel\.app$/.test(origin)) return true;
  if (origin.endsWith("-wyzdesigns-projects.vercel.app")) return true;
  if (process.env.NODE_ENV === "development" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  // Allow any vercel.app subdomain for preview deployments
  if (origin.endsWith(".vercel.app")) return true;
  return false;
}

function corsHeaders(response: NextResponse) {
  const allowedOrigins = ALLOWED_ORIGINS.join(", ");
  response.headers.set("Access-Control-Allow-Origin", MUSE_URL);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export default function proxy(request: NextRequest) {
  // Handle OPTIONS preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return corsHeaders(response);
  }

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
    // Add CORS headers to all API responses
    corsHeaders(response);
    return response;
  }
  
  return NextResponse.next();
}
