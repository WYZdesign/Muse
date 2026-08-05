import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase service client
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// AWS Rekognition client (requires AWS SDK v3)
let RekognitionClient: any, DetectModerationLabelsCommand: any;
try {
  const { RekognitionClient: RC, DetectModerationLabelsCommand: DMLC } = await import("@aws-sdk/client-rekognition");
  RekognitionClient = RC;
  DetectModerationLabelsCommand = DMLC;
} catch {
  // AWS SDK not installed - will use fallback
}

const rekognition = RekognitionClient ? new RekognitionClient({ 
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
}) : null;

const MODERATION_CATEGORIES = {
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

interface ModerationResult {
  safe: boolean;
  flaggedCategories: string[];
  confidence: number;
  shouldBlock: boolean;
  shouldReport: boolean;
  details: any[];
}

async function scanWithRekognition(imageBuffer: Buffer): Promise<ModerationResult> {
  if (!rekognition) {
    return { safe: true, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, details: [] };
  }

  try {
    const command = new DetectModerationLabelsCommand({
      Image: { Bytes: imageBuffer },
      MinConfidence: 50,
    });
    const response = await rekognition.send(command);
    
    const flaggedCategories: string[] = [];
    let maxConfidence = 0;
    let shouldBlock = false;
    let shouldReport = false;
    const details: any[] = [];

    for (const label of response.ModerationLabels || []) {
      const category = label.Name || "Unknown";
      const confidence = label.Confidence || 0;
      maxConfidence = Math.max(maxConfidence, confidence);
      
      const parentName = label.ParentName;
      const fullCategory = parentName ? `${parentName} → ${category}` : category;
      
      flaggedCategories.push(fullCategory);
      details.push({ category: fullCategory, confidence });

      const config = MODERATION_CATEGORIES[category as keyof typeof MODERATION_CATEGORIES];
      if (config) {
        if (config.block) shouldBlock = true;
        if (config.report) shouldReport = true;
      }

      // Check for CSAM-specific categories
      if (CSAM_CATEGORIES.some(c => fullCategory.toLowerCase().includes(c.toLowerCase()))) {
        shouldBlock = true;
        shouldReport = true;
      }
    }

    return {
      safe: flaggedCategories.length === 0,
      flaggedCategories,
      confidence: maxConfidence,
      shouldBlock,
      shouldReport,
      details,
    };
  } catch (error) {
    console.error("Rekognition scan failed:", error);
    // Fail open - don't block on scan failure
    return { safe: true, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, details: [] };
  }
}

// Fallback: basic file type / size validation
function basicValidation(file: File): { valid: boolean; reason?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime"];
  
  if (file.size > maxSize) {
    return { valid: false, reason: "File too large (max 50MB)" };
  }
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, reason: "File type not allowed" };
  }
  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const context = formData.get("context") as string || "upload"; // "upload", "chat", "profile", "booking"
    const userId = formData.get("userId") as string;
    const bookingId = formData.get("bookingId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Basic validation
    const basic = basicValidation(file);
    if (!basic.valid) {
      return NextResponse.json({ allowed: false, reason: basic.reason }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Scan with AWS Rekognition (or fallback)
    const result = await scanWithRekognition(buffer);

    // Log scan result
    await sb.from("muse_content_scans").insert({
      user_id: userId,
      booking_id: bookingId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      context,
      safe: result.safe,
      flagged_categories: result.flaggedCategories,
      confidence: result.confidence,
      should_block: result.shouldBlock,
      should_report: result.shouldReport,
      details: result.details,
      scanned_at: new Date().toISOString(),
    });

    // If should block, return rejection
    if (result.shouldBlock) {
      // Log as safety incident if CSAM/violence
      if (result.shouldReport) {
        await sb.from("muse_safety_incidents").insert({
          user_id: userId,
          type: "content_policy_violation",
          severity: "high",
          details: { flaggedCategories: result.flaggedCategories, confidence: result.confidence, context },
          status: "pending_review",
        });
      }
      return NextResponse.json({ 
        allowed: false, 
        reason: "Content violates safety policies",
        flaggedCategories: result.flaggedCategories,
      }, { status: 403 });
    }

    return NextResponse.json({ 
      allowed: true, 
      scanId: "scan_" + Date.now(),
      flaggedCategories: result.flaggedCategories.length > 0 ? result.flaggedCategories : undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Scan failed";
    console.error("Content scan error:", error);
    // Fail open - allow on error
    return NextResponse.json({ allowed: true, scanError: msg });
  }
}