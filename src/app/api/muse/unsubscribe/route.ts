import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { demoModeUnavailable, isDemoMode } from "@/lib/demo-mode";

/**
 * One-click unsubscribe endpoint for transactional emails.
 * GET: renders a simple confirmation page.
 * POST: handles List-Unsubscribe-Post (one-click) from email clients.
 */
export async function GET(req: NextRequest) {
  if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Email subscription changes"), { status: 409 });
  const email = req.nextUrl.searchParams.get("email") || "";
  if (!email || !email.includes("@")) {
    return new NextResponse("<html><body style='background:#0a0612;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh'><div style='text-align:center'><h2>Invalid email</h2><p>Please check the unsubscribe link.</p></div></body></html>", { status: 400, headers: { "Content-Type": "text/html" } });
  }

  try {
    const sb = getServiceClient();
    await sb.from("muse_waitlist").delete().eq("email", email.toLowerCase());
    await sb.from("muse_unsubscribes").insert({ email: email.toLowerCase(), created_at: new Date().toISOString() }).then(() => {}, () => {});
  } catch (e) {
    console.error("[unsubscribe] error:", e);
  }

  return new NextResponse(`<html><body style="background:#0a0612;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center;max-width:400px;padding:32px"><div style="font-size:32px;margin-bottom:16px">✦</div><h2 style="font-size:20px;color:#ffd700;margin:0 0 12px">You've been unsubscribed</h2><p style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 20px">You won't receive any more emails from Muse. If this was a mistake, you can always sign up again.</p><a href="https://wyzdesign.com/muse/landing" style="display:inline-block;padding:12px 28px;border-radius:12px;background:linear-gradient(120deg,#ffd700,#ff8a80,#d4a5ff);color:#0a0612;font-weight:800;text-decoration:none;font-size:14px">Visit Muse</a></div></body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });
}

export async function POST(req: NextRequest) {
  if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Email subscription changes"), { status: 409 });
  const formData = await req.formData().catch(() => null);
  const email = String(formData?.get("email") || req.nextUrl.searchParams.get("email") || "");
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const sb = getServiceClient();
    await sb.from("muse_waitlist").delete().eq("email", email.toLowerCase());
    await sb.from("muse_unsubscribes").insert({ email: email.toLowerCase(), created_at: new Date().toISOString() }).then(() => {}, () => {});
  } catch (e) {
    console.error("[unsubscribe] POST error:", e);
  }

  return NextResponse.json({ success: true, message: "Unsubscribed" });
}
