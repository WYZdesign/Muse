import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRate, clientIp } from "@/lib/rate-limit";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: NextRequest) {
  try {
    // Rate limit signups to prevent waitlist spam / DB abuse.
    const ip = clientIp(req);
    if (!checkRate(ip, "waitlist", 10)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { email, phone, source } = await req.json();
    
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Check if already exists
    const { data: existing } = await sb.from("muse_waitlist").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Email already on waitlist" }, { status: 409 });
    }

    // Insert waitlist entry
    const { error } = await sb.from("muse_waitlist").insert({
      email: email.toLowerCase(),
      phone: phone || null,
      source: source || "default",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    // Increment counter in analytics
    await sb.from("muse_landing_analytics").upsert({
      date: new Date().toISOString().split("T")[0],
      signups: 1,
    }, { onConflict: "date" });

    // Record signup event for source attribution (QR / referral tracking)
    if (source && source !== "default") {
      await sb.from("muse_qr_events").insert({
        source,
        event_type: "signup",
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, message: "You're on the list!" });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}