import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { sendEmail, betaAccess } from "@/lib/email";
import { demoModeUnavailable, isDemoMode } from "@/lib/demo-mode";
import { AdminPromoteWaitlistSchema, parseWith } from "@/lib/validate";

/**
 * Admin endpoint: promote waitlist members to beta access.
 * POST { email } or { emails: string[] } — sends betaAccess email to each.
 * Protected by rate limiting + service-role auth check.
 */
export async function POST(req: NextRequest) {
  if (isDemoMode()) return NextResponse.json(demoModeUnavailable("Waitlist promotion"), { status: 409 });
  const ip = clientIp(req);
  if (!await checkRate(ip, "admin-promote", 10)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsedBody = parseWith(AdminPromoteWaitlistSchema, rawBody);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sb = getServiceClient();
  const { data: user, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  // Only the owner can promote
  const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || "torree.marcel@gmail.com";
  if (user.user.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const emails = "emails" in parsedBody.data ? parsedBody.data.emails : [parsedBody.data.email];

  const results: { email: string; sent: boolean; error?: string }[] = [];

  for (const rawEmail of emails) {
    const email = rawEmail.toLowerCase();

    // Send beta access email (fail-open)
    const result = await sendEmail(betaAccess(email));
    results.push({ email, sent: result.sent, error: result.error });

    // Keep the member on the waitlist if delivery failed so an admin can retry.
    if (result.sent) {
      await sb.from("muse_waitlist").delete().eq("email", email).then(() => {}, () => {});
    }
  }

  return NextResponse.json({ success: true, results });
}
