import { getServiceClient } from "@/lib/supabase";

// ═══ AWS Rekognition moderation (lazy-load SDK to avoid build-time cost) ═══
let RekognitionClient: any, DetectModerationLabelsCommand: any;
let rekognition: any = null;

async function getRekognition() {
  if (rekognition !== null) return rekognition;
  try {
    const { RekognitionClient: RC, DetectModerationLabelsCommand: DMLC } = await import("@aws-sdk/client-rekognition");
    RekognitionClient = RC;
    DetectModerationLabelsCommand = DMLC;
    const id = process.env.AWS_ACCESS_KEY_ID || "";
    const secret = process.env.AWS_SECRET_ACCESS_KEY || "";
    if (id && secret) {
      rekognition = new RekognitionClient({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: { accessKeyId: id, secretAccessKey: secret },
      });
    }
  } catch {
    rekognition = undefined;
  }
  return rekognition;
}

const MODERATION_CATEGORIES: Record<string, { block: boolean; report: boolean }> = {
  "Explicit Nudity": { block: true, report: true },
  // Boudoir / tasteful / artistic nudity is legitimate on Muse (age-gated, not
  // blocked) — "Suggestive" is allowed through and flagged for the age-gate blur.
  "Suggestive": { block: false, report: false },
  "Violence": { block: true, report: true },
  "Visually Disturbing": { block: true, report: true },
  "Rude Gestures": { block: false, report: false },
  "Drugs": { block: true, report: false },
  "Tobacco": { block: false, report: false },
  "Alcohol": { block: false, report: false },
  "Gambling": { block: false, report: false },
  "Hate Symbols": { block: true, report: true },
};

const CSAM_CATEGORIES = ["Child Sexual Abuse", "Sexual Exploitation of Minors"];

export interface ModerationResult {
  safe: boolean;
  scanned: boolean;
  flaggedCategories: string[];
  confidence: number;
  shouldBlock: boolean;
  shouldReport: boolean;
  isCSAM: boolean;
  details: any[];
}

export async function scanWithRekognition(imageBuffer: Buffer): Promise<ModerationResult> {
  const client = await getRekognition();
  if (!client || !DetectModerationLabelsCommand) {
    // Fail-open: if moderation is unavailable (missing AWS creds / SDK load
    // failure), allow the upload through rather than blocking all images.
    // This lets the app work in dev/test without AWS configured.
    console.warn("[muse:safety] AWS Rekognition unavailable — upload allowed without scan. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION for production content moderation.");
    return { safe: true, scanned: false, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, isCSAM: false, details: [] };
  }
  try {
    const command = new DetectModerationLabelsCommand({
      Image: { Bytes: imageBuffer },
      MinConfidence: 50,
    });
    const response = await client.send(command);
    const flaggedCategories: string[] = [];
    let maxConfidence = 0;
    let shouldBlock = false;
    let shouldReport = false;
    let isCSAM = false;
    const details: any[] = [];

    for (const label of response.ModerationLabels || []) {
      const category = label.Name || "Unknown";
      const confidence = label.Confidence || 0;
      maxConfidence = Math.max(maxConfidence, confidence);
      const parentName = label.ParentName;
      const fullCategory = parentName ? `${parentName} → ${category}` : category;
      flaggedCategories.push(fullCategory);
      details.push({ category: fullCategory, confidence });

      if (CSAM_CATEGORIES.some(c => fullCategory.toLowerCase().includes(c.toLowerCase()))) {
        isCSAM = true;
        shouldBlock = true;
        shouldReport = true;
      }
      const config = MODERATION_CATEGORIES[category];
      if (config) {
        if (config.block) shouldBlock = true;
        if (config.report) shouldReport = true;
      }
    }

    return { safe: flaggedCategories.length === 0, scanned: true, flaggedCategories, confidence: maxConfidence, shouldBlock, shouldReport, isCSAM, details };
  } catch (error) {
    console.error("Rekognition scan failed:", error);
    // Fail-closed: a scan error must never allow content through unchecked.
    return { safe: false, scanned: false, flaggedCategories: ["SCAN_ERROR"], confidence: 0, shouldBlock: true, shouldReport: false, isCSAM: false, details: [] };
  }
}

export async function logScan(meta: {
  userId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  context: string;
  result: ModerationResult;
}) {
  try {
    await getServiceClient().from("muse_content_scans").insert({
      user_id: meta.userId,
      file_name: meta.fileName,
      file_type: meta.fileType,
      file_size: meta.fileSize,
      context: meta.context,
      safe: meta.result.safe,
      flagged_categories: meta.result.flaggedCategories,
      confidence: meta.result.confidence,
      should_block: meta.result.shouldBlock,
      should_report: meta.result.shouldReport,
      is_csam: meta.result.isCSAM,
      scanned: meta.result.scanned,
      details: meta.result.details,
      scanned_at: new Date().toISOString(),
    });
  } catch (e) {
    // Safety scan logs must never be silently lost — at minimum surface the error
    // so it appears in server logs and can be investigated.
    console.error("[contentScan] logScan failed:", e);
  }
}

export async function reportIncident(meta: {
  userId: string;
  context: string;
  result: ModerationResult;
}) {
  try {
    await getServiceClient().from("muse_safety_incidents").insert({
      user_id: meta.userId,
      type: meta.result.isCSAM ? "csam" : "content_policy_violation",
      severity: meta.result.isCSAM ? "critical" : "high",
      details: { flaggedCategories: meta.result.flaggedCategories, confidence: meta.result.confidence, context: meta.context },
      status: meta.result.isCSAM ? "pending_ncmec" : "pending_review",
    });
  } catch (e) {
    console.error("[contentScan] reportIncident failed:", e);
  }
}

// ═══ NCMEC CyberTipline escalation — CSAM only ═══
// When Rekognition flags CSAM (child sexual abuse material), we must:
//   1. Immediately suspend the offender's account (prevent further access)
//   2. Quarantine the offending content (already blocked from storage)
//   3. Queue a CyberTipline report for legal review + submission
// Actual submission to NCMEC requires credentials + legal sign-off; this
// pipeline generates the report payload and stages it for a designated reporter.
export async function escalateToNcmec(meta: {
  userId: string;
  context: string;
  fileName: string;
  result: ModerationResult;
}) {
  try {
    const sb = getServiceClient();

    // 1. Suspend the offending account immediately (fails-closed).
    await sb.from("muse_profiles").update({ suspended: true, suspended_at: new Date().toISOString() }).eq("id", meta.userId);

    // 2. Stage a CyberTipline report for the designated reporter / admin review.
    await sb.from("muse_ncmec_reports").insert({
      user_id: meta.userId,
      file_name: meta.fileName,
      context: meta.context,
      flagged_categories: meta.result.flaggedCategories,
      confidence: meta.result.confidence,
      // CyberTipline report payload — populated for a human/automated submitter.
      report_type: "child_sexual_abuse_material",
      incident_details: {
        categories: meta.result.flaggedCategories,
        confidence: meta.result.confidence,
        reported_at: new Date().toISOString(),
        reporting_mechanism: "aws_rekognition_automated_detection",
      },
      status: "pending_submission",
    });
  } catch (e) {
    console.error("NCMEC escalation failed:", e);
  }
}

// ═══ NCMEC CyberTipline LIVE submission ═══
// Transmits a report to NCMEC's CyberTipline API once ESP credentials are
// provisioned. Register at https://report.cybertip.org → Electronic Service
// Provider (ESP) program, then set:
//   NCMEC_ENDPOINT       — the CyberTipline API base URL (from ESP onboarding docs)
//   NCMEC_CLIENT_ID      — ESP OAuth client id
//   NCMEC_CLIENT_SECRET  — ESP OAuth client secret
// Without credentials, submission is skipped and reports stay "pending_submission"
// for manual filing (or legal review).

const NCMEC_ENDPOINT = process.env.NCMEC_ENDPOINT || "";
const NCMEC_CLIENT_ID = process.env.NCMEC_CLIENT_ID || "";
const NCMEC_CLIENT_SECRET = process.env.NCMEC_CLIENT_SECRET || "";

export function ncmecConfigured(): boolean {
  return Boolean(NCMEC_ENDPOINT && NCMEC_CLIENT_ID && NCMEC_CLIENT_SECRET);
}

async function ncmecAccessToken(): Promise<string | null> {
  try {
    const resp = await fetch(`${NCMEC_ENDPOINT}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: NCMEC_CLIENT_ID,
        client_secret: NCMEC_CLIENT_SECRET,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

/** Transmit a single CSAM report to the CyberTipline. Returns success/failure. */
export async function submitToCyberTipline(report: {
  report_id: string;
  user_id: string;
  file_name: string;
  context: string;
  flagged_categories: string[];
  confidence: number;
  reported_at: string;
}): Promise<{ submitted: boolean; error?: string }> {
  if (!ncmecConfigured()) {
    return { submitted: false, error: "NCMEC credentials not configured" };
  }
  try {
    const token = await ncmecAccessToken();
    if (!token) return { submitted: false, error: "NCMEC auth failed" };

    // CyberTipline report payload — field names per the NCMEC ESP API spec
    // provided at onboarding. Adjust keys to the exact schema if they differ.
    const payload = {
      reportType: "Child Sexual Abuse Material",
      incidentDateTime: report.reported_at,
      reportingParty: {
        espName: "Muse (WYZ Design)",
        espContact: "legal@wyzdesign.com",
      },
      contentDetails: {
        fileName: report.file_name,
        storageLocation: "muse-uploads (Supabase storage)",
        reportedUserId: report.user_id,
      },
      automatedDetection: {
        provider: "AWS Rekognition",
        categories: report.flagged_categories,
        confidence: report.confidence,
      },
      notes: report.context || "",
    };

    const resp = await fetch(`${NCMEC_ENDPOINT}/reports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) return { submitted: false, error: `NCMEC HTTP ${resp.status}` };
    return { submitted: true };
  } catch (e) {
    return { submitted: false, error: e instanceof Error ? e.message : "NCMEC submission failed" };
  }
}

/** Submit all queued (pending_submission) reports. Use from an admin action or cron. */
export async function transmitPendingNcmecReports(): Promise<{ submitted: number; failed: number }> {
  if (!ncmecConfigured()) return { submitted: 0, failed: 0 };
  const sb = getServiceClient();
  const { data: pending } = await sb.from("muse_ncmec_reports").select("*").eq("status", "pending_submission").limit(50);
  let submitted = 0;
  let failed = 0;
  for (const report of pending || []) {
    const r = await submitToCyberTipline({
      report_id: report.id,
      user_id: report.user_id,
      file_name: report.file_name,
      context: report.context,
      flagged_categories: report.flagged_categories || [],
      confidence: report.confidence || 0,
      reported_at: report.created_at || report.incident_details?.reported_at || new Date().toISOString(),
    });
    if (r.submitted) {
      await sb.from("muse_ncmec_reports").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", report.id);
      submitted++;
    } else {
      failed++;
    }
  }
  return { submitted, failed };
}
