import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/http";
import { sendEmail, notify } from "@/lib/email";
import { setReferralQuestProgress } from "@/lib/questEngine";
import Stripe from "stripe";

/**
 * Muse Referral System — double-sided referral codes.
 * POST /api/muse/referral
 *   { action: "generate" | "apply" | "status" | "redeem-reward" }
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
      .select("id, name, email, referral_code, tier, referred_by")
      .eq("auth_id", authData.user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json();
    const { action } = body;

    // Rate limit referral operations to prevent abuse
    const ip = clientIp(req);
    if (action === "generate" && !await checkRate(ip, "referral-generate", 5)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (action === "apply" && !await checkRate(ip, "referral-apply", 5)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (action === "redeem-reward" && !await checkRate(ip, "referral-redeem", 5)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    // ═══ GENERATE: Create a unique referral code for this user ═══
    if (action === "generate") {
      if (profile.referral_code) {
        return NextResponse.json({ code: profile.referral_code, existing: true });
      }

      const code = generateReferralCode(profile.name || profile.id);
      const { error } = await sb.from("muse_profiles").update({ referral_code: code }).eq("id", profile.id);
      if (error) return safeServerError(error, "referral code");

      return NextResponse.json({ code, existing: false });
    }

    // ═══ APPLY: Use someone's referral code during signup ═══
    if (action === "apply") {
      const { referralCode } = body;
      if (!referralCode) return NextResponse.json({ error: "referralCode required" }, { status: 400 });

      const code = String(referralCode).trim().toUpperCase();

      // Find the referrer
      const { data: referrer } = await sb.from("muse_profiles")
        .select("id, name")
        .eq("referral_code", code)
        .maybeSingle();
      if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
      if (String(referrer.id) === String(profile.id)) return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });

      // Check if already referred
      if (profile.referred_by) return NextResponse.json({ error: "Already used a referral code" }, { status: 400 });

      // Record the referral
      const { error: refErr } = await sb.from("muse_referrals").insert({
        referrer_id: referrer.id,
        referral_code: code,
        referee_id: profile.id,
        referred_email: profile.email,
        status: "signed_up",
      });
      if (refErr) return safeServerError(refErr, "referral insert");

      // Update referee's profile
      await sb.from("muse_profiles").update({ referred_by: referrer.id }).eq("id", profile.id);

      // Notify the referrer
      await sb.from("muse_notifications").insert({
        user_id: referrer.id,
        type: "referral_signup",
        body: `${profile.name || "Someone"} joined Muse using your referral code! You'll get a free month when they subscribe.`,
        read: false,
      });
      // Email the referrer (fail-open)
      const { data: referrerFull } = await sb.from("muse_profiles").select("email").eq("id", referrer.id).maybeSingle();
      if (referrerFull?.email) sendEmail(notify(referrerFull.email, "Someone joined via your referral ✦", "Your referral worked", `${profile.name || "Someone"} joined Muse using your referral code. You'll get a free month of Muse Pro when they subscribe.`)).catch(() => {});

      // Quest bump for the referrer: count successful signups.
      await setReferralQuestProgress(sb, referrer.id);

      return NextResponse.json({ success: true, referrerName: referrer.name });
    }

    // ═══ STATUS: Get referral stats for the current user ═══
    if (action === "status") {
      // Ensure user has a code
      let code = profile.referral_code;
      if (!code) {
        code = generateReferralCode(profile.name || profile.id);
        await sb.from("muse_profiles").update({ referral_code: code }).eq("id", profile.id);
      }

      // Count referrals
      const { data: referrals } = await sb.from("muse_referrals")
        .select("id, status, referee_id(name, avatar), created_at")
        .eq("referrer_id", profile.id)
        .order("created_at", { ascending: false });

      const { data: rewards } = await sb.from("muse_referral_rewards")
        .select("id, reward_type, amount_cents, created_at")
        .eq("recipient_id", profile.id)
        .order("created_at", { ascending: false });

      const totalReferrals = (referrals || []).length;
      const signedUp = (referrals || []).filter((r: any) => r.status !== "pending").length;
      const subscribed = (referrals || []).filter((r: any) => r.status === "subscribed" || r.status === "reward_issued").length;
      const freeMonthsEarned = (rewards || []).filter((r: any) => r.reward_type === "free_month").length;

      return NextResponse.json({
        code,
        referralUrl: `https://muse.wyzdesign.com/muse?ref=${code}`,
        totalReferrals,
        signedUp,
        subscribed,
        freeMonthsEarned,
        referrals: referrals || [],
        rewards: rewards || [],
      });
    }

    // ═══ REDEEM-REWARD: Give free month when referee subscribes ═══
    // ═══ REDEEM-REWARD: DISABLED — fraud surface ═══
    // This endpoint performed NO subscription verification: either party to any
    // referral could call it directly and grant themselves a free month for a
    // referral where nothing was ever purchased. Until a verified-purchase check
    // exists (Stripe subscription lookup server-side), it stays disabled.
    if (action === "redeem-reward") {
      return NextResponse.json({ error: "Reward redemption is handled automatically on subscription" }, { status: 410 });
    }
    /* ORIGINAL redeem-reward body disabled — no subscription verification existed,
       letting either party mint free months for any referralId. Preserved below
       for the future verified-purchase implementation.
       ─────────────────────────────────────────────────────────────────────
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

      const { referralId } = body;
      if (!referralId) return NextResponse.json({ error: "referralId required" }, { status: 400 });

      const { data: referral } = await sb.from("muse_referrals")
        .select("*")
        .eq("id", referralId)
        .maybeSingle();
      if (!referral) return NextResponse.json({ error: "Referral not found" }, { status: 404 });
      if (referral.status === "reward_issued") return NextResponse.json({ error: "Reward already issued" }, { status: 400 });

      const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
      const isParty = String(referral.referrer_id) === String(profile.id) || String(referral.referee_id) === String(profile.id);
      const isAdmin = admins.includes((profile.email || "").toLowerCase());
      if (!isParty && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      await sb.from("muse_referrals").update({
        status: "reward_issued",
        reward_issued_at: new Date().toISOString(),
      }).eq("id", referralId);

      await sb.from("muse_referral_rewards").insert([
        { referral_id: referralId, reward_type: "free_month", recipient_id: referral.referrer_id, amount_cents: 0 },
        { referral_id: referralId, reward_type: "free_month", recipient_id: referral.referee_id, amount_cents: 0 },
      ]);

      await sb.from("muse_notifications").insert([
        { user_id: referral.referrer_id, type: "referral_reward", body: "You earned a free month of Muse Pro for a successful referral!", read: false },
        { user_id: referral.referee_id, type: "referral_reward", body: "You received a free month of Muse Pro thanks to a referral!", read: false },
      ]);

      const { data: rewardProfiles } = await sb.from("muse_profiles").select("id,email").in("id", [referral.referrer_id, referral.referee_id]);
      for (const p of (rewardProfiles || [])) {
        if (p?.email) sendEmail(notify(p.email, "Free month unlocked ✦", "You earned a free month", "A referral just went through — you've received a free month of Muse Pro.")).catch(() => {});
      }

      return NextResponse.json({ success: true, message: "Free month issued to both parties" });
     ================================================================================ */

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    console.error("[referral] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function generateReferralCode(seed: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MUSE-";
  // Use a simple hash of the seed for determinism
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
  const rand = Math.abs(hash);
  for (let i = 0; i < 6; i++) code += chars[(rand + i * 7) % chars.length];
  return code;
}
