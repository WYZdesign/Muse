import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find bookings that start in ~24 hours and haven't had check-in sent
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const twentyFiveHoursFromNow = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    const { data: upcomingBookings, error: bookingError } = await sb
      .from("muse_bookings")
      .select("id, user_id, host_id, session_id, status")
      .eq("status", "confirmed")
      .gte("session_id", twentyFourHoursFromNow)
      .lt("session_id", twentyFiveHoursFromNow);

    if (bookingError) throw bookingError;

    let created = 0;
    for (const booking of upcomingBookings || []) {
      // Create check-in for both parties
      for (const userId of [booking.user_id, booking.host_id].filter(Boolean)) {
        const { error: checkinError } = await sb.from("muse_safety_checkins").upsert({
          user_id: userId,
          booking_id: booking.id,
          status: "pending",
          scheduled_for: twentyFourHoursFromNow,
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
    const msg = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}