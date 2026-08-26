import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

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

    return NextResponse.json({ success: true, checkinsCreated: created });
  } catch (error: unknown) {
    console.error("[cron] checkins failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}