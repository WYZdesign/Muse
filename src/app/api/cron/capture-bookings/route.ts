import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceClient } from "@/lib/supabase";

/**
 * Safety net for booking payments authorized with capture_method: "manual".
 *
 * Card authorizations aren't held forever — Stripe auto-cancels an uncaptured
 * manual-capture PaymentIntent once the card network's authorization window
 * expires (typically ~7 days for online card payments, but as short as 4
 * days 18 hours for some Visa flows — see
 * https://docs.stripe.com/payments/place-a-hold-on-a-payment-method#authorization-validity-windows,
 * worth re-checking that page if this ever needs tuning). Normally a
 * booking's payment is captured by the "complete-booking" action in
 * src/app/api/muse/route.ts right after the session happens, well inside
 * that window. This cron exists ONLY for the booking that was booked far
 * enough ahead of its session date that "complete-booking" hasn't fired
 * before the hold is at risk of expiring — without this, that payment
 * would silently expire and the capture would fail out from under the user
 * with no warning.
 *
 * (Stripe also offers a native "automatic_delayed" capture mode that does
 * this same before-expiry auto-capture for you — see the same docs page —
 * but as of this writing it's in Private Preview and requires signing up
 * for early access, and it's set via payment_method_options.card.capture_method,
 * NOT the top-level capture_method field connect/route.ts uses. Until/unless
 * that's confirmed enabled on the live Stripe account, this cron is the
 * generally-available way to get the same guarantee.)
 *
 * CAPTURE_SAFETY_DAYS is deliberately conservative — well inside even the
 * shortest known authorization window (4d18h) — and this runs every 6h
 * (see vercel.json), so worst-case staleness is CAPTURE_SAFETY_DAYS + 6h.
 */
const CAPTURE_SAFETY_DAYS = 4;

export async function GET(req: NextRequest) {
  // Same auth pattern as api/cron/checkins — see the comment there for why
  // the `!process.env.CRON_SECRET ||` guard matters.
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

  try {
    const cutoff = new Date(Date.now() - CAPTURE_SAFETY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // "pending" covers the create-payment (Stripe.js Elements) flow, which
    // records stripe_payment_intent synchronously at creation. "held" covers
    // the create-booking-checkout (redirect) flow, set by the
    // checkout.session.completed webhook once Stripe confirms the session.
    // A row with no stripe_payment_intent yet (redirect flow, checkout never
    // completed) has nothing to capture — excluded by the .not() filter.
    const { data: atRiskPayments, error } = await sb
      .from("muse_booking_payments")
      .select("id, booking_id, payer_id, stripe_payment_intent, status, created_at")
      .in("status", ["pending", "held"])
      .not("stripe_payment_intent", "is", null)
      .neq("stripe_payment_intent", "")
      .lt("created_at", cutoff)
      .limit(100);

    if (error) throw error;

    let captured = 0;
    let skipped = 0;
    let failed = 0;

    for (const payment of atRiskPayments || []) {
      try {
        // Confirm it's actually still an open authorization before touching
        // it — complete-booking may have already captured it (or the buyer
        // may have disputed/canceled) between our query and now.
        const pi = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent!);
        if (pi.status !== "requires_capture") {
          skipped++;
          continue;
        }

        await stripe.paymentIntents.capture(payment.stripe_payment_intent!);
        await sb.from("muse_booking_payments")
          .update({ status: "succeeded", updated_at: new Date().toISOString() })
          .eq("id", payment.id);

        if (payment.payer_id) {
          try {
            await sb.from("muse_notifications").insert({
              user_id: payment.payer_id,
              type: "booking_payment_captured",
              body: "Your booking payment was automatically confirmed ahead of the shoot.",
              read: false,
            });
          } catch { /* non-fatal — the capture itself already succeeded */ }
        }

        captured++;
      } catch (e: unknown) {
        console.error("[cron] capture-bookings failed for payment", payment.id, e);
        failed++;
      }
    }

    return NextResponse.json({ success: true, captured, skipped, failed, checked: (atRiskPayments || []).length });
  } catch (error: unknown) {
    console.error("[cron] capture-bookings failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
