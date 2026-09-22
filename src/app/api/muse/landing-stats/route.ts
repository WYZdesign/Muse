import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/demo-mode";

export async function GET(req: NextRequest) {
  try {
    if (isDemoMode()) return NextResponse.json({ count: 0, demo: true });
    if (!await checkRate(clientIp(req), "landing-stats", 60)) {
      return NextResponse.json({ count: 0 }, { status: 429 });
    }
    // Count real accounts (people who completed signup + created a profile) —
    // the founding-spot counter reflects who actually joined, not just who
    // typed an email into the waitlist form.
    const { count } = await getServiceClient().from("muse_profiles").select("*", { count: "exact", head: true });
    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
