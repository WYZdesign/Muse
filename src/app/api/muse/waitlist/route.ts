import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { sendEmail, waitlistWelcome } from "@/lib/email";
import { demoModeUnavailable, isDemoMode } from "@/lib/demo-mode";
export async function POST(req: NextRequest) {
  const sb = getServiceClient();
  try {
    // Waitlist signup persists personal data and sends a real email.
    if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Waitlist signup"), { status: 409 });
    // Rate limit signups to prevent waitlist spam / DB abuse.
    const ip = clientIp(req);
    if (!await checkRate(ip, "waitlist", 10)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { email: rawEmail, phone, source } = await req.json();

    if (!rawEmail || !rawEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    // Normalize once, use for both dedup check and insert. Previously the check
    // ran against raw mixed-case input while inserts lowercased — "Foo@x.com" and
    // "foo@x.com" both passed dedup as "unique" rows, each firing a welcome email
    // (case-varying spam vector on a victim's address).
    const email = rawEmail.toLowerCase();

    // Atomic insert — unique(email) is the race guard (no select-then-insert window).
    // 23505 = unique_violation → already on list (idempotent 409).
    const { error } = await sb.from("muse_waitlist").insert({
      email,
      phone: phone || null,
      source: source || "default",
      created_at: new Date().toISOString(),
    });

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json({ error: "Email already on waitlist" }, { status: 409 });
      }
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    // Increment counter in analytics (upsert must ADD, not reset to 1).
    const today = new Date().toISOString().split("T")[0];
    const { data: existingDay } = await sb.from("muse_landing_analytics").select("signups").eq("date", today).maybeSingle();
    const newCount = ((existingDay as { signups?: number } | null)?.signups ?? 0) + 1;
    await sb.from("muse_landing_analytics").upsert({
      date: today,
      signups: newCount,
    }, { onConflict: "date" });

    // Record signup event for source attribution (QR / referral tracking)
    if (source && source !== "default") {
      await sb.from("muse_qr_events").insert({
        source,
        event_type: "signup",
        created_at: new Date().toISOString(),
      });
    }

    // Send confirmation email (fail-open — never block signup on email).
    sendEmail(waitlistWelcome(email.toLowerCase(), source)).catch(() => {});

    return NextResponse.json({ success: true, message: "You're on the list!" });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
