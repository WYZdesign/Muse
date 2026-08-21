import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB (matches upload route limit)

/**
 * Validates Content-Type and body size for state-changing requests.
 * Returns 415 or 413 Response if invalid, null if OK.
 */
export async function enforceRequestSafety(req: NextRequest): Promise<NextResponse | null> {
  // Content-Type required for POST/PUT/PATCH
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json") && !ct.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Content-Type must be application/json or multipart/form-data" }, { status: 415 });
    }
  }

  // Body size limit (Content-Length header check — best effort)
  const cl = parseInt(req.headers.get("content-length") || "0", 10);
  if (cl > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  return null;
}

/**
 * Strips HTML/script tags from user-provided text to prevent stored XSS.
 * Keep this light — full sanitization belongs on the render side.
 */
export function sanitizeText(input: string, maxLen = 2000): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .slice(0, maxLen)
    .trim();
}
