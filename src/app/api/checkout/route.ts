import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabase";

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
    const { plan, email, promo } = body as { plan?: string; email?: string; promo?: string };

    if (!plan || !PRICE_MAP[plan]) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    // Resolve identity from the verified session token — never trust a
    // client-supplied userId (that would let anyone tie a checkout to
    // another account and trigger tier changes on their profile).
    const header = req.headers.get("authorization") || "";
    const bearer = header.replace(/^Bearer\s+/i, "").trim();
    const token = bearer || (typeof body.access_token === "string" ? body.access_token : "") || "";
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    const userId = authData.user.id;

    const stripe = new Stripe(secret);

    // ── 100%-off beta promo code ──────────────────────────────────────────
    // Lets a real card pass through the full checkout + webhook + tier-unlock
    // flow at $0 for closed-beta testing. A 100% coupon still creates the
    // subscription and fires checkout.session.completed, so the tier flips to
    // muse_pro — but no charge lands on the card.
    const BETA_PROMO = process.env.MUSE_BETA_PROMO_CODE || "MUSEBETA";
    let discountCouponId: string | null = null;
    if (promo && String(promo).trim().toUpperCase() === BETA_PROMO.toUpperCase()) {
      // Prefer the pre-created MUSEBETA coupon (100% off, created in the
      // Dashboard) so a restricted Vercel key without coupon-write scope
      // still works. Fall back to idempotent on-the-fly creation.
      try {
        const existing = await stripe.coupons.retrieve("MUSEBETA");
        if (existing.valid) discountCouponId = existing.id;
      } catch { /* not found — create below */ }
      if (!discountCouponId) {
        try {
          const coupon = await stripe.coupons.create({
            id: `beta_${plan}_100off`,
            percent_off: 100,
            duration: "forever",
            name: "Muse Beta — 100% off",
          });
          discountCouponId = coupon.id;
        } catch { /* restricted key — proceed without discount */ }
      }
    }
    // ───────────────────────────────────────────────────────────────────────

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
      // Subscription metadata is separate from session metadata — propagate the
      // userId so the webhook can downgrade tier on cancellation.
      subscription_data: { metadata: { userId: userId || "" } },
      ...(discountCouponId ? { discounts: [{ coupon: discountCouponId }] } : {}),
      success_url: `${req.nextUrl.origin}/muse?upgraded=${plan}`,
      cancel_url: `${req.nextUrl.origin}/muse/subscription`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    console.error("[checkout] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
