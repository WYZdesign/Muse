import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { demoModeUnavailable, isDemoMode } from "@/lib/demo-mode";
import { verifyUnsubscribeToken } from "@/lib/email";

/**
 * One-click unsubscribe endpoint for transactional emails.
 * GET: render-only confirmation (never mutates). POST: List-Unsubscribe-Post + link confirm.
 * Both require a signed token (?t=) bound to the email address.
 */
function invalidPage(): NextResponse {
  return new NextResponse(
    "<html><body style='background:#0a0612;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh'><div style='text-align:center'><h2>Invalid unsubscribe link</h2><p>Please use the link from your email.</p></div></body></html>",
    { status: 400, headers: { "Content-Type": "text/html" } },
  );
}

function successHtml(): string {
  return `<html><body style="background:#0a0612;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center;max-width:400px;padding:32px"><div style="font-size:32px;margin-bottom:16px">✦</div><h2 style="font-size:20px;color:#ffd700;margin:0 0 12px">You've been unsubscribed</h2><p style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 20px">You won't receive any more emails from Muse. If this was a mistake, you can always sign up again.</p><a href="https://wyzdesign.com/muse/landing" style="display:inline-block;padding:12px 28px;border-radius:12px;background:linear-gradient(120deg,#ffd700,#ff8a80,#d4a5ff);color:#0a0612;font-weight:800;text-decoration:none;font-size:14px">Visit Muse</a></div></body></html>`;
}

async function applyUnsubscribe(email: string): Promise<void> {
  const sb = getServiceClient();
  const normalized = email.toLowerCase();
  await sb.from("muse_waitlist").delete().eq("email", normalized);
  await sb.from("muse_unsubscribes").insert({ email: normalized, created_at: new Date().toISOString() }).then(() => {}, () => {});
}

export async function GET(req: NextRequest) {
  if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Email subscription changes"), { status: 409 });
  const email = req.nextUrl.searchParams.get("email") || "";
  const token = req.nextUrl.searchParams.get("t") || "";
  if (!email || !email.includes("@") || !verifyUnsubscribeToken(email, token)) {
    return invalidPage();
  }
  // Render-only: confirmation page auto-submits POST (mutation lives on POST only).
  const html = `<html><body style="background:#0a0612;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center"><h2>Confirm unsubscribe</h2><form method="POST" action="/api/muse/unsubscribe"><input type="hidden" name="email" value="${email.replace(/"/g, "&quot;")}"/><input type="hidden" name="t" value="${token.replace(/"/g, "&quot;")}"/><button type="submit" style="padding:12px 28px;border-radius:12px;background:linear-gradient(120deg,#ffd700,#ff8a80,#d4a5ff);color:#0a0612;font-weight:800;border:none;cursor:pointer;font-size:14px">Unsubscribe</button></form></div><script>document.currentScript.parentElement.querySelector("form").submit();</script></body></html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html" } });
}

export async function POST(req: NextRequest) {
  if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Email subscription changes"), { status: 409 });
  const contentType = req.headers.get("content-type") || "";
  let email = "";
  let token = "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    email = String((body as Record<string, unknown>).email || "");
    token = String((body as Record<string, unknown>).t || (body as Record<string, unknown>).token || "");
  } else {
    const formData = await req.formData().catch(() => null);
    email = String(formData?.get("email") || req.nextUrl.searchParams.get("email") || "");
    token = String(formData?.get("t") || formData?.get("token") || req.nextUrl.searchParams.get("t") || "");
  }
  if (!email || !email.includes("@") || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }

  try {
    await applyUnsubscribe(email);
  } catch (e) {
    console.error("[unsubscribe] POST error:", e);
  }

  const listUnsubPost = req.headers.get("list-unsubscribe") === "One-Click";
  if (contentType.includes("application/json") || listUnsubPost) {
    return NextResponse.json({ success: true, message: "Unsubscribed" });
  }
  return new NextResponse(successHtml(), { status: 200, headers: { "Content-Type": "text/html" } });
}
