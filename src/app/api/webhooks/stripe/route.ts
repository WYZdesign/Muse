import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

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
        const userId = session.client_reference_id || session.metadata?.userId;
        // Only ever assign a tier we actually know — never trust arbitrary
        // metadata.plan strings (a stray value would land an unknown tier).
        const KNOWN_TIERS = new Set(["free", "muse_pro", "spark", "muse", "sovereign"]);
        const plan = session.metadata?.plan && KNOWN_TIERS.has(session.metadata.plan) ? session.metadata.plan : "muse_pro";
        if (userId) {
          await sb.from("muse_profiles").update({ tier: plan }).eq("auth_id", userId);
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
