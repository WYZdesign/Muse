// ═══════════════════════════════════════════════════════════════
// Muse AI moderation — LLM-assisted text/content screening.
//
// Cost design: a FREE heuristic pre-filter runs first (keyword/pattern
// checks). The paid/free LLM only fires when heuristics can't decide.
// Fails-open (safe) when AI is unavailable — image moderation is still
// handled separately by AWS Rekognition.
// ═══════════════════════════════════════════════════════════════

import { aiEnabled } from "@/lib/ai";

export interface ModerationVerdict {
  safe: boolean;
  categories: string[];
  severity: "none" | "low" | "high" | "critical";
  recommendation: "allow" | "flag" | "block";
  reason: string;
  usedLLM: boolean;
}

// Cheap, dependency-free heuristics that catch obvious violations without any AI call.
const BLOCK_PATTERNS: { re: RegExp; category: string }[] = [
  { re: /\b(venmo|cashapp|paypal)\b/i, category: "off_platform_payment" },
  { re: /(send|pay) (me|you|u) (money|cash|\$)/i, category: "solicitation" },
  { re: /\b(escort|prostitut|hooker|happy ending)\b/i, category: "sex_work" },
  { re: /\b(underage|minor|teen|jailbait|under\s*18|under18)\b/i, category: "minor_risk" },
  { re: /\b(are you|r u|how old|u\b)[^.!?]{0,20}\b(1[3-7]|eighteen|18)\b/i, category: "minor_risk" },
  { re: /\b(1[3-7])\s*(?:years?\s*old|y\/?o)\b/i, category: "minor_risk" },
  { re: /\bmeet(?:ing)?\b[^.!?]{0,40}\b(my|your)\s+(house|place|apartment|room|hotel)\b/i, category: "unsafe_meetup" },
  { re: /(whatsapp|snapchat|kik|telegram)\b.*\b(add me|dm me|hit me up)\b/i, category: "off_platform_solicitation" },
  { re: /\b(nigga|faggot|retard|slut|whore|cunt)\b/i, category: "hate_speech" },
  { re: /(buy|sell) (drugs|weed|coke|meth|pills)\b/i, category: "drugs" },
  { re: /(gun|weapon|firearm)s?\b.*\b(for sale|sell|buy)\b/i, category: "weapons" },
];

export function heuristicScreen(text: string): { flagged: boolean; categories: string[] } {
  const categories: string[] = [];
  for (const { re, category } of BLOCK_PATTERNS) {
    if (re.test(text)) {
      if (!categories.includes(category)) categories.push(category);
    }
  }
  return { flagged: categories.length > 0, categories };
}

// Categories that warrant an immediate block (vs. a softer flag for review).
const CRITICAL_CATEGORIES = new Set(["minor_risk", "sex_work", "hate_speech", "drugs", "weapons", "unsafe_meetup", "off_platform_solicitation"]);

/** Free, synchronous screen for user-generated text (messages/posts/bios).
 *  Returns whether to block. Zero AI cost — pure regex. */
export function screenText(text: string): { block: boolean; categories: string[] } {
  const { categories } = heuristicScreen(text);
  return { block: categories.some((c) => CRITICAL_CATEGORIES.has(c)), categories };
}

/** LLM-backed classification for text that passed heuristics but needs review. */
async function llmScreen(text: string): Promise<{ safe: boolean; categories: string[]; severity: string; reason: string } | null> {
  if (!aiEnabled()) return null;
  const prompt = `Classify the following user-generated content for a professional creative network (Muse). Respond with ONLY a JSON object, no other text, in the shape {"safe": boolean, "categories": string[], "severity": "none"|"low"|"high"|"critical", "reason": string}.

Categories to detect: spam, harassment, hate_speech, sexual_solicitation, minor_risk, off_platform_payment, scam, self_harm, doxxing, violence, drugs.

Content: """${text.slice(0, 1500)}"""`;

  let raw: string | null;
  try {
    const { chatComplete } = await import("@/lib/ai");
    raw = await chatComplete(
      [{ role: "user", content: prompt }],
      { maxTokens: 600, temperature: 0 }
    );
  } catch {
    // Fail-open: a moderation outage must never block normal content.
    return null;
  }
  if (!raw) return null;
  try {
    // Strip markdown code fences and any reasoning preamble.
    const cleaned = raw.replace(/```(?:json)?/g, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      safe: !!obj.safe,
      categories: Array.isArray(obj.categories) ? obj.categories : [],
      severity: obj.severity || "none",
      reason: obj.reason || "",
    };
  } catch {
    return null;
  }
}

export async function moderateText(text: string): Promise<ModerationVerdict> {
  const cleaned = (text || "").trim();
  if (!cleaned) {
    return { safe: true, categories: [], severity: "none", recommendation: "allow", reason: "empty", usedLLM: false };
  }

  // 1. Heuristic pre-filter (free).
  const heur = heuristicScreen(cleaned);
  if (heur.flagged) {
    const critical = heur.categories.some((c) => ["minor_risk", "sex_work", "hate_speech"].includes(c));
    return {
      safe: false,
      categories: heur.categories,
      severity: critical ? "critical" : "high",
      recommendation: critical ? "block" : "flag",
      reason: "heuristic match",
      usedLLM: false,
    };
  }

  // 2. LLM review for ambiguous text (only when AI is available).
  const llm = await llmScreen(cleaned);
  if (llm) {
    if (llm.safe) {
      return { safe: true, categories: [], severity: "none", recommendation: "allow", reason: llm.reason, usedLLM: true };
    }
    const critical = llm.severity === "critical" || llm.categories.some((c) => ["minor_risk", "self_harm", "doxxing"].includes(c));
    return {
      safe: false,
      categories: llm.categories,
      severity: llm.severity as ModerationVerdict["severity"],
      recommendation: critical ? "block" : "flag",
      reason: llm.reason,
      usedLLM: true,
    };
  }

  // 3. AI unavailable — fails-open (safe). Heuristics already cleared.
  return { safe: true, categories: [], severity: "none", recommendation: "allow", reason: "no AI available", usedLLM: false };
}
