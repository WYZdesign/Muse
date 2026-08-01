import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import crypto from "crypto";

function validatePassword(pw: string): string | null {
  if (pw.length < 6) return "Password must be at least 6 characters";
  if (!/[A-Z]/.test(pw)) return "Password needs a capital letter";
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pw)) return "Password needs a symbol";
  return null;
}

function bearerOrBodyToken(req: NextRequest, body: Record<string, unknown>): string {
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;
  return typeof body.access_token === "string" ? body.access_token : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "register") {
      const { email, password, name, data } = body;
      if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
      const pwErr = validatePassword(password);
      if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

      const sb = getServiceClient();
      const { data: existing } = await sb.from("muse_profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();
      if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

      const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { name: name || email.split("@")[0] },
      });
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

      const { error: profileErr } = await sb.from("muse_profiles").insert({
        auth_id: authUser.user!.id,
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
        ...(data || {}),
      });
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

      return NextResponse.json({ success: true, user: authUser.user });
    }

    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

      const sb = getServiceClient();
      const { data: profile } = await sb.from("muse_profiles").select("*").eq("auth_id", authData.user.id).maybeSingle();

      return NextResponse.json({ success: true, user: authData.user, profile });
    }

    if (action === "session") {
      const { access_token } = body;
      if (!access_token) return NextResponse.json({ error: "No token" }, { status: 401 });

      const { data: { user }, error } = await supabase.auth.getUser(access_token);
      if (error || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

      const sb = getServiceClient();
      let { data: profile } = await sb.from("muse_profiles").select("*").eq("auth_id", user.id).maybeSingle();

      // Auto-create profile for OAuth / first-time users
      if (!profile) {
        const name = (user.user_metadata?.name as string) || (user.email ? user.email.split("@")[0] : "Creative");
        const avatar = (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || "";
        const { data: created, error: createErr } = await sb.from("muse_profiles").insert({
          auth_id: user.id,
          email: (user.email || "").toLowerCase(),
          name,
          avatar,
        }).select("*").single();
        if (!createErr && created) profile = created;
      }

      return NextResponse.json({ success: true, user, profile });
    }

    if (action === "logout") {
      await supabase.auth.signOut();
      return NextResponse.json({ success: true });
    }

    if (action === "forgot-password") {
      const { email } = body;
      if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.nextUrl.origin}/muse/reset-password`,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Check your email for reset link" });
    }

    if (action === "update-password") {
      const { access_token, new_password } = body;
      if (!access_token || !new_password) return NextResponse.json({ error: "Token and new password required" }, { status: 400 });
      const pwErr = validatePassword(new_password);
      if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
      // Verify the token first, then use the admin API (no session needed).
      const { data: tokenUser, error: verifyErr } = await supabase.auth.getUser(access_token);
      if (verifyErr || !tokenUser.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      const sb = getServiceClient();
      const { error } = await sb.auth.admin.updateUserById(tokenUser.user.id, { password: new_password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Password updated" });
    }

    if (action === "update-profile") {
      const accessToken = bearerOrBodyToken(req, body);
      const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
      if (authErr || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      const allowed = ["name", "bio", "loc", "city", "lat", "long", "avatar", "type", "styles", "looking", "photos", "preferences"];
      const updates: Record<string, unknown> = {};
      for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
      if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
      const sb = getServiceClient();
      const { data: existing } = await sb.from("muse_profiles").select("id").eq("auth_id", user.id).maybeSingle();
      if (!existing) {
        const name = (user.user_metadata?.name as string) || (user.email ? user.email.split("@")[0] : "Creative");
        const avatar = (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || "";
        const { error: createErr } = await sb.from("muse_profiles").insert({
          auth_id: user.id,
          email: (user.email || "").toLowerCase(),
          name: typeof updates.name === "string" ? updates.name : name,
          avatar: typeof updates.avatar === "string" ? updates.avatar : avatar,
        });
        if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      const { data, error } = await sb.from("muse_profiles").update(updates).eq("auth_id", user.id).select("*").maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, profile: data });
    }

    if (action === "delete-account") {
      const accessToken = bearerOrBodyToken(req, body);
      const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
      if (authErr || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      const sb = getServiceClient();
      const { data: profile } = await sb.from("muse_profiles").select("id").eq("auth_id", user.id).maybeSingle();
      if (profile) {
        const pid = profile.id;
        await sb.from("muse_messages").delete().or(`sender_id.eq.${pid},receiver_id.eq.${pid}`);
        await sb.from("muse_matches").delete().or(`user_id.eq.${pid},target_id.eq.${pid}`);
        await sb.from("muse_feed_posts").delete().eq("author_id", pid);
        await sb.from("muse_briefs").delete().eq("author_id", pid);
        await sb.from("muse_brief_applications").delete().eq("user_id", pid);
        await sb.from("muse_forum_posts").delete().eq("author_id", pid);
        await sb.from("muse_forum_replies").delete().eq("user_id", pid);
        await sb.from("muse_connections").delete().or(`user_id.eq.${pid},target_id.eq.${pid}`);
        await sb.from("muse_community_members").delete().eq("user_id", pid);
        await sb.from("muse_bookings").delete().eq("user_id", pid);
        await sb.from("muse_notifications").delete().or(`user_id.eq.${pid},from_id.eq.${pid}`);
        await sb.from("muse_push_subscriptions").delete().eq("user_id", pid);
        await sb.from("muse_activity_log").delete().eq("user_id", pid);
        await sb.from("muse_reports").delete().eq("reporter_id", pid);
        await sb.from("muse_blocks").delete().eq("user_id", pid);
        await sb.from("muse_profiles").delete().eq("id", pid);
      }
      await sb.auth.admin.deleteUser(user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
