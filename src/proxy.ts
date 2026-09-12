import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ═══ Muse Edge Proxy ═══
// Runs before every request. Handles:
// 1. Origin/CORS gating for POST/PUT/DELETE API requests
// 2. Rate limiting sensitive API endpoints (in-memory, per-instance)
// 3. Blocking known malicious user agents
// 4. Security headers
//
// NOTE: This is Edge runtime — no Node.js APIs, no database.
// For durable rate limiting, the per-route handlers use checkRate() (Postgres-backed).

// ── Origin allowlist ──
const PROD_ORIGIN = "https://muse.wyzdesign.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || PROD_ORIGIN;
let ALLOWED_ORIGINS: string[];
try {
  ALLOWED_ORIGINS = [new URL(APP_URL).origin];
} catch {
  ALLOWED_ORIGINS = [PROD_ORIGIN];
}
if (!ALLOWED_ORIGINS.includes(PROD_ORIGIN)) ALLOWED_ORIGINS.push(PROD_ORIGIN);

const AUTH_PATHS = ["/api/muse/auth"];

// ── Edge rate limiting ──
const SENSITIVE_ROUTES: Record<string, number> = {
  "/api/muse/mfa": 30,
  "/api/muse/push": 60,
  "/api/muse/verification": 10,
  "/api/muse/connect": 10,
  "/api/muse/referral": 20,
  "/api/muse/social": 20,
};

const RATE_MAP = new Map<string, number[]>();
function edgeRateCheck(key: string, maxPerMin: number): boolean {
  const now = Date.now();
  const ts = (RATE_MAP.get(key) || []).filter((t) => now - t < 60_000);
  if (ts.length >= maxPerMin) return false;
  ts.push(now);
  RATE_MAP.set(key, ts);
  return true;
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of RATE_MAP.entries()) {
      const fresh = v.filter((t) => now - t < 60_000);
      if (fresh.length === 0) RATE_MAP.delete(k);
      else RATE_MAP.set(k, fresh);
    }
  }, 60_000);
}

const BLOCKED_AGENTS = /bot\b|crawl|spider|scrape|curl|wget|python-requests/i;

function clientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

function originFromReq(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (origin) {
    try { return new URL(origin).origin; } catch { return null; }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin; } catch { return null; }
  }
  return null;
}

export default function proxy(req: NextRequest): Response {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  // ── Non-API: just add security headers ──
  if (!pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return res;
  }

  // ── Block known bad user agents ──
  const ua = req.headers.get("user-agent") || "";
  if (BLOCKED_AGENTS.test(ua)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Origin / CORS gating for mutating API requests ──
  if (method !== "GET" && method !== "HEAD") {
    const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
    if (!isAuthPath) {
      const origin = originFromReq(req);
      const isAllowed = origin !== null && ALLOWED_ORIGINS.includes(origin);
      if (!isAllowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // ── Edge rate limiting for sensitive API routes ──
  const ip = clientIp(req);
  for (const [route, limit] of Object.entries(SENSITIVE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!edgeRateCheck(`${ip}:${route}`, limit)) {
        return NextResponse.json({ error: "Rate limited" }, { status: 429 });
      }
      break;
    }
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Set CORS header for API responses
  const requestOrigin = req.headers.get("origin");
  if (requestOrigin) {
    try {
      const reqOrigin = new URL(requestOrigin).origin;
      if (ALLOWED_ORIGINS.includes(reqOrigin)) {
        res.headers.set("Access-Control-Allow-Origin", reqOrigin);
      }
    } catch { /* ignore malformed origin */ }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
