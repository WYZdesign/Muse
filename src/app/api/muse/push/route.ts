import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/http";
import { sendPushToUser, getVapidPublicKey } from "@/lib/push";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, subscription, access_token, userId: bodyUserId, payload } = body;

    if (action === "send" && bodyUserId && payload) {
      const result = await sendPushToUser(bodyUserId, payload);
      return NextResponse.json({ success: true, ...result });
    }

    if (!action || !subscription || !access_token) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Validate the access token against Supabase auth
    const { data: authData, error: authErr } = await supabase.auth.getUser(access_token);
    if (authErr || !authData.user) {
      return NextResponse.json({ success: false, error: "Invalid access token" }, { status: 401 });
    }

    const authId = authData.user.id;

    // Resolve the muse profile id from the auth id
    const sb = getServiceClient();
    const { data: profile, error: profileErr } = await sb
      .from("muse_profiles")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const userId = profile.id;
    const endpoint = subscription.endpoint;
    const p256dh = subscription.p256dh;
    const auth = subscription.auth;

    const ip = clientIp(req);

    if (action === "subscribe") {
      if (!await checkRate(ip, "push-subscribe", 10)) {
        return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 });
      }
      if (!endpoint || !p256dh || !auth) {
        return NextResponse.json({ success: false, error: "Incomplete subscription payload" }, { status: 400 });
      }
      // Requires UNIQUE(endpoint) on muse_push_subscriptions — see SQL migration.
      const { data, error } = await sb
        .from("muse_push_subscriptions")
        .upsert({ user_id: userId, endpoint, p256dh, auth }, { onConflict: "endpoint" })
        .select();
      if (error) {
        // 409 unique-violation on endpoint is benign — record already exists.
        if ((error as { code?: string }).code === "23505") return NextResponse.json({ success: true });
        return safeServerError(error, "push subscribe");
      }
      return NextResponse.json({ success: true, data });
    }

    if (action === "unsubscribe") {
      if (!await checkRate(ip, "push-unsubscribe", 10)) {
        return NextResponse.json({ success: false, error: "Rate limited" }, { status: 429 });
      }
      if (!endpoint) {
        return NextResponse.json({ success: false, error: "Missing endpoint" }, { status: 400 });
      }
      const { error } = await sb
        .from("muse_push_subscriptions")
        .delete()
        // Ownership: tie the delete to the authenticated caller, not just the
        // endpoint — endpoints are unguessable in practice, but this costs nothing.
        .eq("endpoint", endpoint)
        .eq("user_id", userId);
      if (error) {
        return safeServerError(error, "push unsubscribe");
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    console.error("[push] failed:", e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
