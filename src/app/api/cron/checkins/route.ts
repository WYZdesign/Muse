import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { sendEmail, notify } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Verify cron secret. The `!process.env.CRON_SECRET ||` guard matters — without
  // it, an unset secret makes `expected` the literal "Bearer undefined", which
  // anyone sending that exact header would pass (backup/route.ts already guards).
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  try {
    // Find sessions dated ~24 hours out (muse_sessions.date is a "YYYY-MM-DD" TEXT
    // string). muse_bookings.session_id is a UUID FK to muse_sessions(id), NOT a
    // timestamp — filtering bookings by session_id against datetimes never matches.
    const targetDay = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: sessions, error: sessionError } = await sb
      .from("muse_sessions")
      .select("id")
      .eq("date", targetDay);

    if (sessionError) throw sessionError;
    const sessionIds = (sessions || []).map(s => s.id);
    if (sessionIds.length === 0) {
      return NextResponse.json({ success: true, checkinsCreated: 0 });
    }

    const { data: upcomingBookings, error: bookingError } = await sb
      .from("muse_bookings")
      .select("id, user_id, host_id, session_id, status")
      .eq("status", "confirmed")
      .in("session_id", sessionIds);

    if (bookingError) throw bookingError;

    let created = 0;
    for (const booking of upcomingBookings || []) {
      // Create check-in for both parties
      for (const userId of [booking.user_id, booking.host_id].filter(Boolean)) {
        // Match the actual muse_safety_checkins schema (checkin_type, status, notes)
        // — there is no scheduled_for column.
        const { error: checkinError } = await sb.from("muse_safety_checkins").upsert({
          user_id: userId,
          booking_id: booking.id,
          checkin_type: "pre_shoot_24h",
          status: "pending",
        }, { onConflict: "user_id,booking_id" });

        if (!checkinError) {
          // Send notification
          await sb.from("muse_notifications").insert({
            user_id: userId,
            from_id: booking.host_id === userId ? booking.user_id : booking.host_id,
            type: "checkin",
            body: "Your shoot is tomorrow. Please confirm everything is still on track.",
            read: false,
          });
          created++;
        }
      }
    }

    // ── Escalate overdue check-ins ─────────────────────────────────────
    // Find check-ins that are still "pending" and were created more than 24h
    // ago — the shoot time has passed and the user never responded.
    const overdueCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: overdueCheckins } = await sb
      .from("muse_safety_checkins")
      .select("id, user_id, booking_id, created_at")
      .eq("status", "pending")
      .lt("created_at", overdueCutoff)
      .limit(50);

    let escalated = 0;
    for (const ci of overdueCheckins || []) {
      // Mark as escalated
      await sb.from("muse_safety_checkins").update({
        status: "escalated",
        escalated_at: new Date().toISOString(),
      }).eq("id", ci.id);

      // Notify the overdue user
      try {
        await sb.from("muse_notifications").insert({
          user_id: ci.user_id,
          type: "safety_escalation",
          body: "You missed a safety check-in. Please confirm you're safe.",
          read: false,
        });
      } catch { /* non-fatal */ }

      // Notify the other party in the booking
      if (ci.booking_id) {
        const { data: bk } = await sb.from("muse_bookings")
          .select("user_id, host_id").eq("id", ci.booking_id).maybeSingle();
        if (bk) {
          const otherId = String(bk.user_id) === String(ci.user_id) ? bk.host_id : bk.user_id;
          if (otherId && String(otherId) !== String(ci.user_id)) {
            try {
              await sb.from("muse_notifications").insert({
                user_id: otherId,
                type: "safety_escalation",
                body: "Your shoot partner missed a safety check-in. We've notified them.",
                read: false,
              });
            } catch { /* non-fatal */ }
          }
        }
      }

      // Escalate to emergency contact if auto-share is enabled
      const { data: safetyProfile } = await sb.from("muse_safety_profiles")
        .select("trusted_friend_email, trusted_friend_name, emergency_contact_name, emergency_contact_phone, auto_share_enabled")
        .eq("user_id", ci.user_id).maybeSingle();

      if (safetyProfile?.auto_share_enabled && safetyProfile.trusted_friend_email) {
        const { data: userProfile } = await sb.from("muse_profiles")
          .select("name, email").eq("id", ci.user_id).maybeSingle();

        sendEmail(notify(
          safetyProfile.trusted_friend_email,
          `Safety check-in missed by ${userProfile?.name || "a Muse user"}`,
          "Muse Safety Escalation",
          `${userProfile?.name || "A Muse user"} missed a scheduled safety check-in. ` +
          `Their emergency contact is ${safetyProfile.emergency_contact_name || "not set"} ` +
          `(${safetyProfile.emergency_contact_phone || "no phone"}). ` +
          `Please check on them.`
        )).catch((e: unknown) => console.error("[cron] safety escalation email failed:", e));
      }

      escalated++;
    }

    return NextResponse.json({ success: true, checkinsCreated: created, escalated });
  } catch (error: unknown) {
    console.error("[cron] checkins failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}