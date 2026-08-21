import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceClient } from "@/lib/supabase";
import { sendEmail, notify } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Grant the double-sided referral reward (free month) when a referred user
 * subscribes. Idempotent — skips referrals already marked reward_issued.
 */
async function grantReferralReward(sb: ReturnType<typeof getServiceClient>, authUserId: string) {
  try {
    const { data: profile } = await sb.from("muse_profiles").select("id, email, referred_by").eq("auth_id", authUserId).maybeSingle();
    if (!profile || !profile.referred_by) return;

    const { data: referral } = await sb.from("muse_referrals")
      .select("*")
      .eq("referee_id", profile.id)
      .eq("referrer_id", profile.referred_by)
      .maybeSingle();
    if (!referral || referral.status === "reward_issued") return;

    await sb.from("muse_referrals").update({
      status: "reward_issued",
      reward_issued_at: new Date().toISOString(),
    }).eq("id", referral.id);

    await sb.from("muse_referral_rewards").insert([
      { referral_id: referral.id, reward_type: "free_month", recipient_id: referral.referrer_id, amount_cents: 0 },
      { referral_id: referral.id, reward_type: "free_month", recipient_id: referral.referee_id, amount_cents: 0 },
    ]);

    await sb.from("muse_notifications").insert([
      { user_id: referral.referrer_id, type: "referral_reward", body: "You earned a free month of Muse Pro for a successful referral!", read: false },
      { user_id: referral.referee_id, type: "referral_reward", body: "You received a free month of Muse Pro thanks to a referral!", read: false },
    ]);

    const { data: rewardProfiles } = await sb.from("muse_profiles").select("id,email").in("id", [referral.referrer_id, referral.referee_id]);
    for (const p of (rewardProfiles || [])) {
      if (p?.email) sendEmail(notify(p.email, "Free month unlocked ✦", "You earned a free month", "A referral just went through — you've received a free month of Muse Pro.")).catch(() => {});
    }
  } catch (e: unknown) {
    console.error("[webhook] referral reward failed:", e);
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    const sb = getServiceClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Booking payment (manual capture / escrow): store the PaymentIntent + mark held
        const musePayerId = session.metadata?.muse_payer_id;
        const museBookingId = session.metadata?.muse_booking_id;
        if (musePayerId && session.payment_intent) {
          await sb.from("muse_booking_payments")
            .update({
              stripe_payment_intent: String(session.payment_intent),
              status: "held",
              updated_at: new Date().toISOString(),
            })
            .eq("booking_id", museBookingId || "")
            .eq("status", "pending");
          break;
        }
        // Subscription — only ever assign a tier we actually know
        const userId = session.client_reference_id || session.metadata?.userId;
        // Only ever assign a tier we actually know — never trust arbitrary
        // metadata.plan strings (a stray value would land an unknown tier).
        const KNOWN_TIERS = new Set(["free", "muse_pro", "spark", "muse", "sovereign"]);
        const plan = session.metadata?.plan && KNOWN_TIERS.has(session.metadata.plan) ? session.metadata.plan : "muse_pro";
        if (userId) {
          await sb.from("muse_profiles").update({ tier: plan }).eq("auth_id", userId);
          // Referral reward: if the subscriber was referred, grant both parties a
          // free month (the "both get a free month" loop). Idempotent — a referral
          // that already earned a reward is skipped.
          await grantReferralReward(sb, userId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        // userId is propagated into subscription_data.metadata at checkout.
        const userId = sub.metadata?.userId as string | undefined;
        if (userId) {
          await sb.from("muse_profiles").update({ tier: "free" }).eq("auth_id", userId);
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const musePayerId = pi.metadata?.muse_payer_id;
        const musePayeeId = pi.metadata?.muse_payee_id;
        if (musePayerId && musePayeeId) {
          // Update booking payment status
          await sb.from("muse_booking_payments").update({
            status: "succeeded",
            stripe_transfer_id: pi.transfer_data?.destination as string || null,
            updated_at: new Date().toISOString(),
          }).eq("stripe_payment_intent", pi.id);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await sb.from("muse_booking_payments").update({
          status: "failed",
          updated_at: new Date().toISOString(),
        }).eq("stripe_payment_intent", pi.id);
        break;
      }
      // Any other event — no-op, acknowledged to avoid Stripe retry spam.
    }

    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    console.error("[webhook] stripe failed:", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
