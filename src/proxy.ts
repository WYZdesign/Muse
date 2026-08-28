import { NextRequest, NextResponse } from "next/server";
import { getMuseUrl } from "@/lib/urls";

const MUSE_URL = getMuseUrl();
const WYZDESIGN_URL = "https://www.wyzdesign.com";

const ALLOWED_ORIGINS = [
  MUSE_URL,
  WYZDESIGN_URL,
  WYZDESIGN_URL.replace("www.", ""),
];

// Auth endpoints that should be more permissive
const AUTH_PATHS = ["/api/muse/auth", "/api/muse/social", "/api/muse/social/callback"];

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

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(p => pathname.startsWith(p));
}

function corsHeaders(response: NextResponse, origin?: string) {
  // Use the requesting origin if allowed, otherwise default to MUSE_URL
  const allowOrigin = origin && originAllowed(origin) ? origin : MUSE_URL;
  response.headers.set("Access-Control-Allow-Origin", allowOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export default function proxy(request: NextRequest) {
  // Handle OPTIONS preflight requests
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin") || "";
    const response = new NextResponse(null, { status: 204 });
    return corsHeaders(response, origin);
  }

  const pathname = request.nextUrl.pathname;
  const isAuth = isAuthPath(pathname);

  // Skip origin check for auth endpoints - allow login from any device
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin") || "";
    const referer = request.headers.get("referer") || "";
    
    // Always allow auth endpoints from any origin
    if (!isAuth) {
      if (!originAllowed(origin) && !originAllowed(referer.split("/").slice(0, 3).join("/"))) {
        return NextResponse.json({ error: "Forbidden — cross-origin request blocked" }, { status: 403 });
      }
    }
  }

  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin") || "";
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Cache-Control", "no-store, max-age=0");
    // Add CORS headers to all API responses
    corsHeaders(response, origin);
    return response;
  }
  
  return NextResponse.next();
}
