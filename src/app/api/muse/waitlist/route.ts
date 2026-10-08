/** POST /api/muse/waitlist — public waitlist signup with referral + queue position. */
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { sendEmail, waitlistWelcome } from "@/lib/email";
import { demoModeUnavailable, isDemoMode } from "@/lib/demo-mode";
import { parseWith, WaitlistSchema } from "@/lib/validate";
import {
  lookupByCode,
  pickReferralCode,
  queuePosition,
  shareUrl,
} from "@/lib/waitlist-queue";
import crypto from "crypto";

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

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    // Validate + normalize once, use for both dedup check and insert. Previously
    // the check ran against raw mixed-case input while inserts lowercased —
    // "Foo@x.com" and "foo@x.com" both passed dedup as "unique" rows, each
    // firing a welcome email (case-varying spam vector on a victim's address).
    const parsed = parseWith(WaitlistSchema, body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { phone, source, ref } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    // Attribution: a stale or invented ?ref= must never block a signup, so a
    // miss records a plain signup instead of a 400.
    const referrer = ref ? await lookupByCode(sb, ref) : null;
    const referralCode = await pickReferralCode(sb);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Atomic insert — unique(email) is the race guard (no select-then-insert window).
    // 23505 = unique_violation → already on list (idempotent 409).
    const { error } = await sb.from("muse_waitlist").insert({
      id,
      email,
      phone: phone || null,
      source: source || "default",
      referral_code: referralCode,
      referred_by: referrer?.id ?? null,
      created_at: createdAt,
    });

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        // Deliberately NO slot data in this response. The endpoint is
        // unauthenticated, so returning the existing row's position, referral
        // code or share link would let anyone learn a stranger's code (and
        // confirm the address is on the list) just by submitting that email.
        // A truthful message plus the code is all the caller gets; recovering
        // the link is done from the signup email, not by re-submitting here.
        return NextResponse.json(
          { error: "Email already on waitlist", code: "ALREADY_ON_LIST" },
          { status: 409 },
        );
      }
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    const { position, total, referrals } = await queuePosition(sb, { id, created_at: createdAt });

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
    sendEmail(waitlistWelcome(email.toLowerCase(), source ?? undefined)).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "You're on the list!",
      position,
      total,
      referrals,
      referralCode,
      shareUrl: shareUrl(referralCode),
    });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
