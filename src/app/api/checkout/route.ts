import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { checkRate, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const PRICE_MAP: Record<string, string> = {
  muse_pro: "price_muse_pro_monthly",
  // Legacy tiers kept for backward-compat redirects
  spark: "price_muse_pro_monthly",
  muse: "price_muse_pro_monthly",
  sovereign: "price_muse_pro_monthly",
};

export async function POST(req: NextRequest) {
  try {
    // Rate limit Stripe session creation to prevent API abuse / cost spikes.
    const ip = clientIp(req);
    if (!checkRate(ip, "checkout", 10)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

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
        name: "Muse Pro",
        metadata: { plan: "muse_pro" },
      });
      const amount = 999; // $9.99/month
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: "price_muse_pro_monthly",
        metadata: { plan: "muse_pro" },
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
