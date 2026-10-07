import { NextResponse } from "next/server";

// Small shared response helpers so routes return errors in one consistent
// shape. safeServerError() deliberately never leaks `e` to the client (only
// logs it server-side) — route handlers should use it instead of
// NextResponse.json({ error: String(e) }) for anything unexpected.
export function jsonError(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}

export function safeServerError(e: unknown, context?: string): Response {
  if (context) console.error(`[api] ${context}:`, e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
