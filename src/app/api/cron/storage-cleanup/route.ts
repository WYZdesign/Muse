import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demo-mode";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;
const ALLOWED_BUCKETS = new Set(["muse-private", "muse-uploads"]);

type CleanupJob = {
  id: string;
  bucket: string;
  path: string;
  attempts: number;
};

function isSafeStoragePath(path: unknown): path is string {
  return typeof path === "string"
    && path.length > 0
    && !path.startsWith("/")
    && !path.includes("..")
    && !path.includes("\\")
    && !path.includes("\0")
    && path.split("/").every((segment) => segment.length > 0);
}

function retryAt(attempt: number): string {
  // 5, 15, 45, and 135 minutes; after the fifth attempt the job is dead-lettered.
  const delayMinutes = 5 * 3 ** Math.max(0, attempt - 1);
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

export async function GET(req: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoMode()) return NextResponse.json({ success: true, demo: true, cleaned: 0, retried: 0, failed: 0 });

  const sb = getServiceClient();
  try {
    const now = new Date().toISOString();
    const { data: candidates, error } = await sb
      .from("muse_storage_cleanup_jobs")
      .select("id, bucket, path, attempts")
      .eq("status", "pending")
      .lte("next_attempt_at", now)
      .order("next_attempt_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (error) throw error;

    let cleaned = 0;
    let retried = 0;
    let failed = 0;

    for (const candidate of (candidates || []) as CleanupJob[]) {
      const attempt = Number(candidate.attempts || 0) + 1;
      // The conditional status update is the lease: only one concurrent worker
      // can change a pending job to processing and receive its selected row.
      const claim = await sb
        .from("muse_storage_cleanup_jobs")
        .update({ status: "processing", attempts: attempt, updated_at: new Date().toISOString() })
        .eq("id", candidate.id)
        .eq("status", "pending")
        .select("id, bucket, path, attempts")
        .maybeSingle();
      if (claim.error || !claim.data) continue;

      const job = claim.data as CleanupJob;
      if (!ALLOWED_BUCKETS.has(job.bucket) || !isSafeStoragePath(job.path)) {
        await sb.from("muse_storage_cleanup_jobs").update({
          status: "failed",
          last_error: "Invalid storage cleanup locator",
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        failed++;
        continue;
      }

      try {
        const { error: removeError } = await sb.storage.from(job.bucket).remove([job.path]);
        if (removeError) throw removeError;
        const { error: doneError } = await sb.from("muse_storage_cleanup_jobs").update({
          status: "done",
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        if (doneError) throw doneError;
        cleaned++;
      } catch (cleanupError) {
        const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        const terminal = attempt >= MAX_ATTEMPTS;
        await sb.from("muse_storage_cleanup_jobs").update({
          status: terminal ? "failed" : "pending",
          last_error: message.slice(0, 500),
          // Keep this non-null for the migration invariant; failed rows are
          // excluded by status and become the explicit dead-letter queue.
          next_attempt_at: retryAt(attempt),
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        if (terminal) failed++; else retried++;
      }
    }

    return NextResponse.json({ success: true, cleaned, retried, failed, checked: (candidates || []).length });
  } catch (error) {
    console.error("[cron] storage-cleanup failed", error);
    return NextResponse.json({ error: "Storage cleanup failed" }, { status: 500 });
  }
}
