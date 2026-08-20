import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    if (!await checkRate(clientIp(req), "landing-stats", 60)) {
      return NextResponse.json({ count: 0 }, { status: 429 });
    }
    const { count } = await getServiceClient().from("muse_profiles").select("*", { count: "exact", head: true });
    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}