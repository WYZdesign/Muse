import { NextResponse } from "next/server";

export function jsonError(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}

export function safeServerError(e: unknown, context?: string): Response {
  if (context) console.error(`[api] ${context}:`, e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
