import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRate, clientIp } from "@/lib/rate-limit";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(req: NextRequest) {
  try {
    if (!checkRate(clientIp(req), "landing-stats", 60)) {
      return NextResponse.json({ count: 0 }, { status: 429 });
    }
    const { count } = await sb.from("muse_profiles").select("*", { count: "exact", head: true });
    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}