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
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-06-30.acacia" as any });
    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    const sb = getServiceClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const plan = session.metadata?.plan || "spark";
        if (userId) {
          await sb.from("muse_profiles").update({ tier: plan }).eq("auth_id", userId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
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
    const msg = e instanceof Error ? e.message : "Webhook error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
