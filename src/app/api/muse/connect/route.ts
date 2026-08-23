import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { parseRateToCents } from "@/lib/money";
import Stripe from "stripe";

export const runtime = "nodejs";

const COMMISSION_RATE = 0.05; // 5% marketplace commission

/**
 * Muse Stripe Connect API — marketplace payments with 5% commission.
 * POST /api/muse/connect
 *   { action: "create-account" | "create-payment" | "account-status" | "transfer" }
 */
export async function POST(req: NextRequest) {
  try {
    const header = req.headers.get("authorization") || "";
    const bearer = header.replace(/^Bearer\s+/i, "").trim();
    if (!bearer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: authData } = await supabase.auth.getUser(bearer);
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: profile } = await sb.from("muse_profiles")
      .select("id, name, email, tier, stripe_connect_id")
      .eq("auth_id", authData.user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    const stripe = new Stripe(secret);

    const body = await req.json();
    const { action } = body;

    // Rate limit financial operations
    const ip = clientIp(req);
    if (action === "create-account" && !await checkRate(ip, "connect-create-account", 5)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (action === "create-payment" && !await checkRate(ip, "connect-create-payment", 10)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (action === "account-status" && !await checkRate(ip, "connect-account-status", 30)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (action === "transfer" && !await checkRate(ip, "connect-transfer", 5)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    // ═══ CREATE-ACCOUNT: Onboard user as Stripe Connect account ═══
    if (action === "create-account") {
      // Check if already connected
      if (profile.stripe_connect_id) {
        const account = await stripe.accounts.retrieve(profile.stripe_connect_id);
        return NextResponse.json({
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          onboardingComplete: account.charges_enabled && account.payouts_enabled,
        });
      }

      // Create new Connected Account
      const account = await stripe.accounts.create({
        type: "express",
        email: profile.email || undefined,
        metadata: { muse_user_id: profile.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      // Save to DB
      await sb.from("muse_stripe_connect").upsert({
        user_id: profile.id,
        stripe_account_id: account.id,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      }, { onConflict: "user_id" });

      await sb.from("muse_profiles").update({ stripe_connect_id: account.id }).eq("id", profile.id);

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${req.nextUrl.origin}/muse/settings`,
        return_url: `${req.nextUrl.origin}/muse?connected=true`,
        type: "account_onboarding",
      });

      return NextResponse.json({
        accountId: account.id,
        onboardingUrl: accountLink.url,
        onboardingComplete: false,
      });
    }

    // ═══ CREATE-PAYMENT: Pay for a booking via marketplace ═══
    if (action === "create-payment") {
      const { payeeId, amountCents, description, bookingId } = body;
      if (!payeeId) return NextResponse.json({ error: "payeeId required" }, { status: 400 });
      if (String(payeeId) === String(profile.id)) return NextResponse.json({ error: "Cannot pay yourself" }, { status: 400 });

      // Payment-integrity: if a booking is supplied, derive the amount from
      // its session's declared rate — never trust a client-supplied amount.
      let amount: number;
      if (bookingId) {
        const { data: booking } = await sb.from("muse_bookings")
          .select("id, user_id, session_id").eq("id", bookingId).maybeSingle();
        if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        if (String(booking.user_id) !== String(profile.id)) return NextResponse.json({ error: "Only the booker can pay" }, { status: 403 });
        const { data: sessionRec } = await sb.from("muse_sessions").select("rate").eq("id", booking.session_id).maybeSingle();
        const parsed = sessionRec ? parseRateToCents(sessionRec.rate) : null;
        if (parsed === null) return NextResponse.json({ error: "Session has no valid single rate set" }, { status: 400 });
        amount = parsed;
      } else {
        // No booking — legacy/standalone payment. Still validate the shape.
        amount = Number(amountCents);
        if (!Number.isInteger(amount) || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      // Fetch payee's connect account
      const { data: payee } = await sb.from("muse_profiles")
        .select("id, stripe_connect_id, name")
        .eq("id", payeeId).maybeSingle();
      if (!payee?.stripe_connect_id) return NextResponse.json({ error: "Payee has no Stripe account" }, { status: 400 });

      // Check payee is onboarded
      const payeeAccount = await stripe.accounts.retrieve(payee.stripe_connect_id);
      if (!payeeAccount.charges_enabled) return NextResponse.json({ error: "Payee account not fully onboarded" }, { status: 400 });

      const commission = Math.round(amount * COMMISSION_RATE);
      const netAmount = amount - commission;

      // Create PaymentIntent with destination charge
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        capture_method: "manual",
        application_fee_amount: commission,
        transfer_data: { destination: payee.stripe_connect_id },
        description: description || `Muse booking payment to ${payee.name}`,
        metadata: {
          muse_payer_id: profile.id,
          muse_payee_id: payeeId,
          muse_booking_id: bookingId || "",
          commission_cents: String(commission),
          net_cents: String(netAmount),
        },
      });

      // Record the payment
      await sb.from("muse_booking_payments").insert({
        booking_id: bookingId || null,
        payer_id: profile.id,
        payee_id: payeeId,
        stripe_payment_intent: paymentIntent.id,
        amount_cents: amount,
        commission_cents: commission,
        net_amount_cents: netAmount,
        status: "pending",
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amountCents: amount,
        commissionCents: commission,
        netCents: netAmount,
        commissionPct: COMMISSION_RATE * 100,
      });
    }

    // ═══ CREATE-BOOKING-CHECKOUT: Redirect-based booking payment (no client Stripe.js needed) ═══
    if (action === "create-booking-checkout") {
      const { bookingId, description } = body;
      if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

      // ── Payment-integrity: derive the amount + payee from the booking's
      // session SERVER-SIDE. Never trust a client-supplied amount — anyone
      // could craft an API call and charge an arbitrary figure. ──
      const { data: booking } = await sb.from("muse_bookings")
        .select("id, user_id, host_id, session_id")
        .eq("id", bookingId).maybeSingle();
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      if (String(booking.user_id) !== String(profile.id)) {
        return NextResponse.json({ error: "Only the booker can pay for this booking" }, { status: 403 });
      }

      const { data: sessionRec } = await sb.from("muse_sessions")
        .select("id, host_id, rate, title")
        .eq("id", booking.session_id).maybeSingle();
      if (!sessionRec) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      // Guard against double payment: if a prior checkout for this booking
      // already reached "held" (authorized) or "succeeded" (captured), don't
      // let a second Checkout Session get created — that would authorize a
      // second charge for the same booking. A "pending"/"failed"/missing row
      // (abandoned or failed checkout) is still fine to retry.
      const { data: existingPayment } = await sb.from("muse_booking_payments")
        .select("status").eq("booking_id", bookingId).maybeSingle();
      if (existingPayment && (existingPayment.status === "held" || existingPayment.status === "succeeded")) {
        return NextResponse.json({ error: "This booking has already been paid for" }, { status: 409 });
      }

      // Authoritative amount from the host's declared rate.
      const amount = parseRateToCents(sessionRec.rate);
      if (amount === null) {
        return NextResponse.json({ error: "This session has no valid single rate set — please ask the host to update it." }, { status: 400 });
      }

      // Authoritative payee from the session host (not the client).
      const payeeId = sessionRec.host_id || booking.host_id;
      if (!payeeId) return NextResponse.json({ error: "Host not found" }, { status: 400 });
      if (String(payeeId) === String(profile.id)) return NextResponse.json({ error: "Cannot pay yourself" }, { status: 400 });

      const { data: payee } = await sb.from("muse_profiles")
        .select("id, stripe_connect_id, name")
        .eq("id", payeeId).maybeSingle();
      if (!payee?.stripe_connect_id) return NextResponse.json({ error: "Payee has no Stripe account" }, { status: 400 });
      const payeeAccount = await stripe.accounts.retrieve(payee.stripe_connect_id);
      if (!payeeAccount.charges_enabled) return NextResponse.json({ error: "Payee account not fully onboarded" }, { status: 400 });

      const commission = Math.round(amount * COMMISSION_RATE);
      const netAmount = amount - commission;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: { currency: "usd", unit_amount: amount, product_data: { name: description || sessionRec.title || `Muse booking with ${payee.name}` } },
          quantity: 1,
        }],
        payment_intent_data: {
          capture_method: "manual",
          application_fee_amount: commission,
          transfer_data: { destination: payee.stripe_connect_id },
          metadata: {
            muse_payer_id: profile.id, muse_payee_id: payeeId, muse_booking_id: bookingId,
            commission_cents: String(commission), net_cents: String(netAmount),
          },
        },
        success_url: `${req.nextUrl.origin}/muse?payment=success`,
        cancel_url: `${req.nextUrl.origin}/muse?payment=cancelled`,
      });

      // Upsert (idempotent) — a user who abandons checkout and pays again
      // must reuse the same row, not create a duplicate that breaks
      // complete-booking's maybeSingle() lookup. Requires the unique
      // constraint from sql/MUSE_BOOKING_PAYMENT_UNIQUE_20260819.sql.
      await sb.from("muse_booking_payments").upsert({
        booking_id: bookingId, payer_id: profile.id, payee_id: payeeId,
        stripe_payment_intent: "", amount_cents: amount, commission_cents: commission,
        net_amount_cents: netAmount, status: "pending",
      }, { onConflict: "booking_id" });

      return NextResponse.json({ url: session.url, amountCents: amount, commissionCents: commission });
    }

    // ═══ ACCOUNT-STATUS: Check Connect account status ═══
    if (action === "account-status") {
      if (!profile.stripe_connect_id) return NextResponse.json({ connected: false });

      const account = await stripe.accounts.retrieve(profile.stripe_connect_id);
      // Update DB
      await sb.from("muse_stripe_connect").update({
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        updated_at: new Date().toISOString(),
      }).eq("user_id", profile.id);

      return NextResponse.json({
        connected: true,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        onboardingComplete: account.charges_enabled && account.payouts_enabled,
      });
    }

    // ═══ TRANSFER: Manual transfer (admin only) ═══
    if (action === "transfer") {
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
      if (!authData.user.email || !admins.includes(authData.user.email.toLowerCase())) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }

      const { paymentId } = body;
      if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

      const { data: payment } = await sb.from("muse_booking_payments").select("*, payee_id(stripe_connect_id)").eq("id", paymentId).maybeSingle();
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      if (payment.status !== "succeeded") return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 });

      return NextResponse.json({ message: "Transfer handled by destination charge automatically", paymentId });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    console.error("[connect] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
