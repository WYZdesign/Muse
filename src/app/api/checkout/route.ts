import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const PRICE_MAP: Record<string, string> = {
  spark: "price_spark_monthly",
  muse: "price_muse_monthly",
  sovereign: "price_sovereign_monthly",
};

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

    const body = await req.json();
    const { plan, email, userId } = body as { plan?: string; email?: string; userId?: string };

    if (!plan || !PRICE_MAP[plan]) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const stripe = new Stripe(secret, { apiVersion: "2025-06-30.acacia" as any });

    // Look up an existing price for this plan, or create one on the fly.
    let priceId: string | null = null;
    try {
      const prices = await stripe.prices.list({ lookup_keys: [PRICE_MAP[plan]], limit: 1, active: true });
      if (prices.data.length > 0) priceId = prices.data[0].id;
    } catch { /* fall through to dynamic product creation */ }

    if (!priceId) {
      // Create a product + recurring price dynamically — works for first-time
      // setup or when prices haven't been manually created in the Dashboard.
      const product = await stripe.products.create({
        name: `Muse ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
        metadata: { plan },
      });
      const amount = { spark: 999, muse: 2499, sovereign: 4999 }[plan] || 2499;
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: PRICE_MAP[plan],
        metadata: { plan },
      });
      priceId = price.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      client_reference_id: userId || undefined,
      metadata: { plan, userId: userId || "" },
      success_url: `${req.nextUrl.origin}/muse?upgraded=${plan}`,
      cancel_url: `${req.nextUrl.origin}/muse/subscription`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
