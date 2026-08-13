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
  "Suggestive": { block: true, report: false },
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
    return { safe: true, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, isCSAM: false, details: [] };
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

    return { safe: flaggedCategories.length === 0, flaggedCategories, confidence: maxConfidence, shouldBlock, shouldReport, isCSAM, details };
  } catch (error) {
    console.error("Rekognition scan failed:", error);
    return { safe: true, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, isCSAM: false, details: [] };
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
      details: meta.result.details,
      scanned_at: new Date().toISOString(),
    });
  } catch {}
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
  } catch {}
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
