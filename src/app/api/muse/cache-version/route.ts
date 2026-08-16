import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Remote kill-switch: bump MUSE_CACHE_VERSION in Vercel env to force every
 * client to purge its service worker + caches and hard-reload on next visit —
 * without shipping a code deploy. Used to recover the whole user base from a
 * bad release or a poison-cached HTML shell.
 *
 * The client compares this value to a sessionStorage copy; on mismatch it
 * clears SW + CacheStorage and reloads once.
 */
export async function GET() {
  const version = process.env.MUSE_CACHE_VERSION || "0";
  return NextResponse.json({ version }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
