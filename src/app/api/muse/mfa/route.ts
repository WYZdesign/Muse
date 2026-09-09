import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ═══ MFA / 2FA (Supabase Auth TOTP) ═══
// Supabase Auth has TOTP MFA enabled for this project (mfa_totp_enroll_enabled,
// mfa_totp_verify_enabled). This route wraps the supabase-js auth.mfa API so the
// client can enroll/verify/manage a TOTP authenticator factor — WITHOUT touching
// the existing email/social login flow. Actions are called with the current
// user's session token (read via the route's access token in the shared handler
// elsewhere), so only an authenticated+verified user can manage their own factor.
//
// Available: GET ?type=mfa-status | mfa-factors, POST { action: enroll|verify|unenroll|challenge }
// This uses the anon client (browser-supplied session token) — MFA must run for
// the logged-in user, not the service role.

const MFA_ACTIONS = new Set(["enroll", "verify", "verify-code", "unenroll", "challenge", "verify-session"]);

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "mfa-status";
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const client = supabase;
  const { data: user, error: authErr } = await client.auth.getUser(token);
  if (authErr || !user.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  if (type === "mfa-factors") {
    const { data: factors, error } = await client.auth.mfa.listFactors();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({
      totp: factors.totp || [],
      all: [...(factors.totp || [])],
    });
  }

  // mfa-status = compact summary used by a Settings toggle.
  if (type === "mfa-status") {
    const { data: factors, error } = await client.auth.mfa.listFactors();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const totp = factors.totp || [];
    return NextResponse.json({
      enabled: totp.some((f: any) => f.status === "verified"),
      factors: totp.map((f: any) => ({ id: f.id, status: f.status, friendlyName: f.friendly_name })),
    });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const client = supabase;
  const { data: user, error: authErr } = await client.auth.getUser(token);
  if (authErr || !user.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const action = String(body.action || "");
  if (!MFA_ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  if (action === "enroll") {
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: String(body.friendlyName || "Muse authenticator").slice(0, 30),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({
      id: data.id,
      type: data.type,
      secret: data.totp?.secret ?? null,
      // QR URI (otpauth://) for authenticator apps / a QR generator on the client.
      qr_uri: data.totp?.qr_code ?? null,
    });
  }

  if (action === "verify" || action === "verify-code") {
    // Standard Supabase TOTP verification: challenge the factor, then verify the
    // code against that challenge. This is the only valid MFA verify path
    // (supabase-js requires a challengeId).
    const { factorId, code } = body;
    if (!factorId || !code) return NextResponse.json({ error: "factorId and code required" }, { status: 400 });
    const { data: chData, error: chErr } = await client.auth.mfa.challenge({ factorId });
    if (chErr || !chData) return NextResponse.json({ error: chErr?.message || "No challenge" }, { status: 400 });
    const { data, error } = await client.auth.mfa.verify({ factorId, challengeId: chData.id, code: String(code).replace(/\s/g, "") });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === "challenge") {
    const { factorId } = body;
    if (!factorId) return NextResponse.json({ error: "factorId required" }, { status: 400 });
    const { data, error } = await client.auth.mfa.challenge({ factorId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ challengeId: data.id });
  }

  if (action === "unenroll") {
    const { factorId } = body;
    if (!factorId) return NextResponse.json({ error: "factorId required" }, { status: 400 });
    const { error } = await client.auth.mfa.unenroll({ factorId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
