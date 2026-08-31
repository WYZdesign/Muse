import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const PRICE_MAP: Record<string, string> = {
  muse_pro: "price_muse_pro_monthly",
  muse_pro_annual: "price_muse_pro_annual",
  muse_studio: "price_muse_studio_monthly",
  // Legacy tiers kept for backward-compat redirects
  muse: "price_muse_pro_monthly",
  sovereign: "price_muse_pro_monthly",
};

// Dev/test-mode fallback pricing (only used when STRIPE_SECRET_KEY isn't a live key) —
// must match PRICE_MAP's keys so a test-mode checkout of any plan creates the right product/price
// instead of always defaulting to the original $9.99/mo Muse Pro price regardless of which plan was requested.
const DEV_FALLBACK_PRICING: Record<string, { name: string; amount: number; interval: "month" | "year" }> = {
  muse_pro: { name: "Muse Pro", amount: 999, interval: "month" },
  muse_pro_annual: { name: "Muse Pro Annual", amount: 7999, interval: "year" },
  muse_studio: { name: "Muse Studio", amount: 2999, interval: "month" },
  muse: { name: "Muse Pro", amount: 999, interval: "month" },
  sovereign: { name: "Muse Pro", amount: 999, interval: "month" },
};

export async function POST(req: NextRequest) {
  try {
    // Rate limit Stripe session creation to prevent API abuse / cost spikes.
    const ip = clientIp(req);
    if (!await checkRate(ip, "checkout", 10)) {
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
      // Admin-gate: only ADMIN_EMAILS can use the beta promo code.
      const { data: promoProfile } = await supabase.from("muse_profiles")
        .select("email").eq("auth_id", userId).maybeSingle();
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
      if (!promoProfile?.email || !admins.includes(promoProfile.email.toLowerCase())) {
        return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
      }
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

    // Look up an existing price for this plan. In LIVE mode, a miss is an
    // operator error (the price must exist), NOT a cue to silently mint a
    // throwaway product with a wrong/missing Managed Payments category. Only
    // allow on-the-fly creation against non-live keys, where it's harmless.
    let priceId: string | null = null;
    try {
      const prices = await stripe.prices.list({ lookup_keys: [PRICE_MAP[plan]], limit: 1, active: true });
      if (prices.data.length > 0) priceId = prices.data[0].id;
    } catch (e) {
      console.error("[checkout] price lookup failed:", e);
    }

    if (!priceId) {
      const isLive = /^sk_live_/i.test(secret);
      if (isLive) {
        // Fail loudly — never silently create a product/price in production.
        console.error(`[checkout] price lookup key "${PRICE_MAP[plan]}" not found in LIVE mode; refusing to auto-create.`);
        return NextResponse.json({ error: "Subscription price not configured. Please contact support." }, { status: 500 });
      }
      // Test/dev only: create a product + recurring price on the fly, using
// the fallback config for the ACTUAL plan requested — this used to be
// hardcoded to always mint "Muse Pro" at $9.99/month regardless of
// which plan the client asked for, so testing muse_pro_annual or
// muse_studio in dev silently checked out the wrong product/price.
      const fallback = DEV_FALLBACK_PRICING[plan] || DEV_FALLBACK_PRICING.muse_pro;
      const product = await stripe.products.create({
        name: fallback.name,
        metadata: { plan },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: fallback.amount,
        currency: "usd",
        recurring: { interval: fallback.interval },
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
      // Subscription metadata is separate from session metadata — propagate the
      // userId so the webhook can downgrade tier on cancellation.
      subscription_data: { metadata: { userId: userId || "" } },
      ...(discountCouponId ? { discounts: [{ coupon: discountCouponId }] } : {}),
      // Stripe forbids sending `allow_promotion_codes` together with a
      // `discounts` list — only expose the native promo field when no
      // coupon is already pinned to the session (and omit it entirely,
      // since passing `false` is still rejected by Stripe).
      ...(discountCouponId ? {} : { allow_promotion_codes: true }),
      success_url: `${req.nextUrl.origin}/muse?upgraded=${plan}`,
      // `/muse/subscription` isn't a real route — subscription is a
      // client-side screen state on `/muse`, not its own page — so a
      // cancelled checkout used to 404 here. Land back on the real route.
      cancel_url: `${req.nextUrl.origin}/muse`,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    console.error("[checkout] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
