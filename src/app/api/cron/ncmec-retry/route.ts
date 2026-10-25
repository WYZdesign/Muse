/** Scheduled retry for CyberTipline reports staged but not yet transmitted. */
import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { ncmecConfigured, transmitPendingNcmecReports } from "@/lib/contentScan";

export async function GET(req: NextRequest) {
  // Fail closed when the secret is unset: without the `!process.env.CRON_SECRET`
  // guard, expected would be the literal "Bearer undefined" and any caller
  // sending that header would pass.
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoMode()) {
    return NextResponse.json({ success: true, demo: true, submitted: 0, failed: 0 });
  }

  try {
    const result = await transmitPendingNcmecReports();
    return NextResponse.json({ success: true, configured: ncmecConfigured(), ...result });
  } catch (error: unknown) {
    console.error("[cron] ncmec retry failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
