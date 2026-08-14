import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { askMuseAI, retrieveContext } from "@/lib/aiDocs";

export const runtime = "nodejs";

// Static FAQ fallback used when AI is unavailable (no key / no docs seeded).
const FALLBACK_ANSWERS: { re: RegExp; answer: string }[] = [
  { re: /(verif|age|18|identity|id\b)/i, answer: "Muse verifies identity and age through Stripe Identity. Go to the Verify section in the app to start. Verified profiles get a checkmark badge." },
  { re: /(report|block|ban|abuse|safety|harass)/i, answer: "To report a user or content, open their profile or the content and tap Report. For blocking, open their profile and tap Block. Reports are reviewed by moderators." },
  { re: /(book|session|booking|shoot)/i, answer: "To book a session, open a creative's profile and tap Book Session. You'll set the time and may need to complete identity verification and a disclosure (consent form) first." },
  { re: /(album|portfolio|photo)/i, answer: "You can create albums in your profile. Each album can be public, private, or invite-only, and you control who sees each one." },
  { re: /(billing|pay|subscription|pro|upgrade|price)/i, answer: "Billing and subscriptions (Muse Pro) are handled through Stripe. Manage your plan in account settings." },
  { re: /(delete|account|data|privacy|remove)/i, answer: "You can delete your account from account settings, which removes your profile and data. For privacy questions, see the Privacy Policy linked in the app menu." },
];

function fallbackAnswer(q: string): string {
  for (const f of FALLBACK_ANSWERS) {
    if (f.re.test(q)) return f.answer;
  }
  return "I can help with how Muse works, safety, bookings, albums, and account questions. For anything else, email support@wyzdesign.com.";
}

export async function POST(req: NextRequest) {
  try {
    if (!checkRate(clientIp(req), "support", 10)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const question = (body.question || body.q || "").toString().trim().slice(0, 2000);
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

    // Try the AI (RAG + LLM). Falls back to static FAQ if AI is unavailable.
    const ai = await askMuseAI(question);
    if (ai) {
      return NextResponse.json({ answer: ai.answer, sources: ai.sources, ai: true });
    }

    // No AI — still give a useful answer from retrieval alone (context-only).
    const { context } = await retrieveContext(question);
    if (context) {
      return NextResponse.json({ answer: context, sources: [], ai: false, partial: true });
    }

    return NextResponse.json({ answer: fallbackAnswer(question), sources: [], ai: false });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
