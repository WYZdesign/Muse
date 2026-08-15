import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const sb = getServiceClient();
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { data: profile } = await sb.from("muse_profiles").select("id").eq("auth_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { action } = await req.json();

    // Rate limit verification sessions to prevent Stripe API abuse
    const ip = clientIp(req);
    if (action === "create-verification-session" && !checkRate(ip, "verify-create", 5)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (action === "create-age-gate-session" && !checkRate(ip, "verify-age-gate", 5)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    if (action === "create-verification-session") {
      // Create Stripe Identity verification session (hosted redirect flow)
      const session = await stripe.identity.verificationSessions.create({
        type: "document",
        options: {
          document: {
            allowed_types: ["driving_license", "passport", "id_card"],
            require_live_capture: true,
            require_matching_selfie: true,
          },
        },
        metadata: { muse_profile_id: profile.id, muse_user_id: user.id },
        return_url: `${req.nextUrl.origin}/muse/verify`,
      });

      // Store session ID for later retrieval
      await sb.from("muse_verification_sessions").upsert({
        user_id: profile.id,
        stripe_session_id: session.id,
        status: "pending",
        created_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return NextResponse.json({ clientSecret: session.client_secret, sessionId: session.id, url: session.url });
    }

    if (action === "get-verification-status") {
      const { data: session } = await sb.from("muse_verification_sessions").select("*").eq("user_id", profile.id).maybeSingle();
      if (!session) return NextResponse.json({ status: "not_started" });

      // Check Stripe for latest status
      if (session.stripe_session_id) {
        const stripeSession = await stripe.identity.verificationSessions.retrieve(session.stripe_session_id);
        const status = stripeSession.status; // "pending", "verified", "requires_input", "canceled"

        if (status !== session.status) {
          await sb.from("muse_verification_sessions").update({ status, updated_at: new Date().toISOString() }).eq("id", session.id);
          if (status === "verified") {
            await sb.from("muse_profiles").update({ age_verified: true, age_verified_at: new Date().toISOString() }).eq("id", profile.id);
          }
        }
        return NextResponse.json({ status, verifiedOutputs: stripeSession.verified_outputs });
      }

      return NextResponse.json({ status: session.status });
    }

    if (action === "create-age-gate-session") {
      // For paid bookings - require age verification before proceeding
      const { data: profileData } = await sb.from("muse_profiles").select("age_verified").eq("id", profile.id).maybeSingle();
      if (profileData?.age_verified) {
        return NextResponse.json({ required: false, message: "Already age verified" });
      }

      // Create a verification session specifically for age gating
      const session = await stripe.identity.verificationSessions.create({
        type: "document",
        options: {
          document: {
            allowed_types: ["driving_license", "passport", "id_card"],
            require_live_capture: true,
            require_matching_selfie: true,
          },
        },
        metadata: { muse_profile_id: profile.id, muse_user_id: user.id, purpose: "age_gate_booking" },
        return_url: `${req.nextUrl.origin}/muse/verify`,
      });

      await sb.from("muse_verification_sessions").upsert({
        user_id: profile.id,
        stripe_session_id: session.id,
        status: "pending",
        purpose: "age_gate",
        created_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return NextResponse.json({ required: true, clientSecret: session.client_secret, sessionId: session.id, url: session.url });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Age verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}