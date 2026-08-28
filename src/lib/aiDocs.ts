// ═══════════════════════════════════════════════════════════════
// Muse knowledge base + retrieval (RAG).
// The Muse AI is "aware" of the app by retrieving relevant doc
// chunks per query. Docs are embedded ONCE (seedKnowledgeBase) and
// cached in muse_ai_docs; each query only embeds the short query
// string (cheap) and ranks cached vectors with cosine (free).
// ═══════════════════════════════════════════════════════════════

import { getServiceClient } from "@/lib/supabase";
import { embedText, cosineSimilarity, aiEnabled } from "@/lib/ai";
import { getMuseUrl } from "@/lib/urls";

export interface MuseDoc {
  section: string;
  title: string;
  content: string;
}

// Single source of truth for what the Muse AI knows about the product.
// Keep this accurate to the live app's features.
export const MUSE_KNOWLEDGE_BASE: MuseDoc[] = [
  { section: "about", title: "What is Muse", content: "Muse is a professional networking platform for creatives — photographers, models, filmmakers, musicians, writers, designers, and artists. It helps creative professionals discover each other, collaborate, book paid sessions, build portfolios, and join communities. Its tagline is 'Where Creatives Connect.'" },
  { section: "onboarding", title: "Getting started", content: "New members create a profile with their name, creative type, bio, styles, looking-for preferences, zodiac, MBTI, and life path number. They can add portfolio photos, albums, and answer onboarding prompts. Profile completion is tracked as a percentage; a more complete profile gets better discovery visibility." },
  { section: "discovery", title: "Discovery and matching", content: "The Discover feed shows other creatives as swipeable cards. Matching combines rules-based compatibility (shared styles, zodiac/MBTI/life-path compatibility) with AI semantic similarity of profiles. Users swipe or tap to express interest; mutual interest creates a match." },
  { section: "matches", title: "Matches and chat", content: "When two creatives express mutual interest, they become a match and can message each other in the app. Matches appear in the Matches tab. Chat supports preset quick-message suggestions for faster conversation." },
  { section: "albums", title: "Albums and portfolio", content: "Each profile can have multiple named albums with photos. Albums have privacy levels: public, private, or invite-only. Invite-only albums are visible only to specific viewers granted access by the owner." },
  { section: "bookings", title: "Bookings and sessions", content: "Creatives can book sessions with each other. Bookings capture host, guest, session time, and payment. Booking a session may require identity verification via Stripe Identity. Payments are processed through Stripe, and hosts can onboard with Stripe Connect to receive payouts." },
  { section: "disclosures", title: "Disclosures (consent & boundaries)", content: "Before certain shoots, Muse facilitates a disclosure between parties covering compensation, content scope (nudity, boudoir, fashion, etc.), explicit boundary checklists, location, people present, usage rights, NDA, and model releases. Both parties confirm the disclosure before proceeding." },
  { section: "safety", title: "Safety check-ins", content: "Muse has a safety system with check-ins before, during, and after shoots. Users can set emergency contacts and trusted friends; shoot details can be shared with trusted contacts via SMS, email, or link. Check-ins confirm everything is on track." },
  { section: "verification", title: "Identity verification", content: "Muse uses Stripe Identity for age and identity verification. Verified profiles display a verification badge. In certain age-verification states (TX, LA, AR, UT), verification is required before accessing adult content toggles or booking certain sessions." },
  { section: "moderation", title: "Content moderation and safety", content: "All uploaded content is scanned via AWS Rekognition moderation for nudity, violence, and other categories. Content depicting or suggesting child sexual abuse material (CSAM) triggers immediate account suspension and escalation to the NCMEC CyberTipline. Other policy violations create strikes; repeated strikes lead to suspension or ban." },
  { section: "strikes", title: "Strikes and enforcement", content: "Muse uses a strike system. Standard violations (spam, rudeness) escalate gradually. High-severity violations (NSFW solicitation, coercion, assault) result in immediate suspension or permanent ban. Users can appeal strikes." },
  { section: "geo", title: "Age-verification states", content: "Muse geo-blocks certain features in Texas, Louisiana, Arkansas, and Utah where age-verification laws apply. In those states, identity verification via Stripe Identity is required before viewing adult-content settings or booking certain sessions." },
  { section: "communities", title: "Communities and groups", content: "Muse has community groups and events organized by creative niche, location, or interest. Creatives join communities to network, share work, and find collaborators." },
  { section: "feed", title: "Feed and posts", content: "The Feed shows posts and moments from creatives in your network. Users can create posts with text and images, and share updates with the community." },
  { section: "referrals", title: "Referrals and rewards", content: "Muse has a referral program. Members refer other creatives, and when referred members sign up, the referrer can earn rewards." },
  { section: "subscription", title: "Subscription and billing", content: "Muse Pro is the paid tier. Billing is handled through Stripe Checkout. Subscription upgrades happen through the checkout flow; cancellation and billing management are available in account settings." },
  { section: "legal", title: "Legal and policies", content: "Muse has a Terms of Service, Privacy Policy, DMCA policy, and Safety/Community Guidelines. The DMCA policy describes how to file and respond to copyright takedown notices. The Safety Guidelines describe the content policy and reporting process." },
  { section: "privacy", title: "Privacy and data", content: "Muse stores profile data, messages, and activity. Data is stored in Supabase with row-level security. Users can delete their account, which removes their profile and data. Sensitive content is scanned and quarantined per policy." },
  { section: "reporting", title: "Reporting and blocking", content: "Users can report other profiles or content for policy violations, and block users to prevent further contact. Reports go to moderators for review. Blocking hides the user and prevents messaging." },
  { section: "support", title: "Support and help", content: "For help, users can reach support at info@wyzdesign.com. Common topics include account access, verification, billing, reporting safety concerns, and how to use albums, bookings, and disclosures." },
  { section: "ai", title: "AI features", content: "Muse uses AI for matching and recommendations (semantic profile similarity) and for an in-app support assistant. The support assistant answers questions about how Muse works, safety, and account help using this knowledge base." },
];

/** Embed + upsert every KB doc into muse_ai_docs. One-time cost (~20-30k tokens). */
export async function seedKnowledgeBase(): Promise<{ embedded: number; skipped: number }> {
  const sb = getServiceClient();
  let embedded = 0;
  let skipped = 0;

  for (const doc of MUSE_KNOWLEDGE_BASE) {
    try {
      // Skip re-embedding if a fresh embedding already exists.
      const { data: existing } = await sb.from("muse_ai_docs").select("id, embedding, updated_at").eq("title", doc.title).maybeSingle();
      if (existing && Array.isArray(existing.embedding) && existing.embedding.length > 0) {
        skipped++;
        continue;
      }
      const vector = await embedText(`${doc.section}: ${doc.title}\n${doc.content}`);
      if (!vector) continue;
      await sb.from("muse_ai_docs").upsert(
        { section: doc.section, title: doc.title, content: doc.content, embedding: vector, updated_at: new Date().toISOString() },
        { onConflict: "title" }
      );
      embedded++;
    } catch (e) {
      console.error("[muse:ai] seed doc failed:", doc.title, e);
    }
  }
  return { embedded, skipped };
}

/** Free keyword retrieval over the in-memory KB (no embeddings, no DB). */
function keywordRetrieve(query: string, limit = 5): { context: string; sources: string[] } {
  const q = query.toLowerCase();
  const terms = q.split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  const scored = MUSE_KNOWLEDGE_BASE.map((doc) => {
    const hay = `${doc.section} ${doc.title} ${doc.content}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (hay.includes(t)) score += 1;
    }
    if (doc.title.toLowerCase().includes(q) || q.includes(doc.title.toLowerCase())) score += 2;
    return { doc, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If nothing matches, return a sensible default (about + support).
  const picked = scored.length ? scored.map((s) => s.doc) : MUSE_KNOWLEDGE_BASE.filter((d) => d.section === "about" || d.section === "support");
  return {
    context: picked.map((d) => `${d.title}: ${d.content}`).join("\n\n"),
    sources: picked.map((d) => d.title),
  };
}

/** Retrieve the most relevant KB chunks for a query as a single context string. */
export async function retrieveContext(query: string, limit = 5): Promise<{ context: string; sources: string[] }> {
  const sb = getServiceClient();
  const { data: docs } = await sb.from("muse_ai_docs").select("section, title, content, embedding");

  if (!docs || docs.length === 0) {
    // Knowledge base not seeded — keyword retrieval over the in-memory KB.
    return keywordRetrieve(query, limit);
  }

  const qv = await embedText(query);
  if (!qv) {
    // No AI — return a few generic docs as context.
    const top = docs.slice(0, limit);
    return { context: top.map((d: any) => `${d.title}: ${d.content}`).join("\n\n"), sources: top.map((d: any) => d.title) };
  }

  const ranked = (docs as any[])
    .filter((d) => Array.isArray(d.embedding) && d.embedding.length === qv.length)
    .map((d) => ({ ...d, score: cosineSimilarity(qv, d.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    context: ranked.map((d) => `${d.title}: ${d.content}`).join("\n\n"),
    sources: ranked.map((d) => d.title),
  };
}

/** Build a system prompt that grounds the AI in Muse. */
export function museSystemPrompt(): string {
  return `You are Muse, the warm and personable assistant for Muse (${getMuseUrl()}), a professional networking platform for creatives — photographers, models, filmmakers, musicians, writers, designers, and artists. You help members with how the product works, safety, and account support. Be friendly, conversational, and genuinely helpful — like a creative friend who knows the platform inside and out. Keep answers clear and concise. If you don't know something, say so honestly and point them to info@wyzdesign.com. Never invent features or policies.`;
}

/** Answer a question using retrieved context + the LLM. Returns null if AI is unavailable. */
export async function askMuseAI(question: string, opts?: { forAdmin?: boolean }): Promise<{ answer: string; sources: string[] } | null> {
  if (!aiEnabled()) return null;
  const { context, sources } = await retrieveContext(question);
  const sys = museSystemPrompt() + (opts?.forAdmin ? " You are assisting the Muse owner/admin. You may reference internal metrics provided to you." : "");
  const { chatComplete } = await import("@/lib/ai");

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: sys },
  ];
  if (context) {
    messages.push({ role: "system", content: `Relevant Muse documentation:\n\n${context}` });
  }
  messages.push({ role: "user", content: question });

  const answer = await chatComplete(messages, { maxTokens: 900, temperature: 0.3 });
  if (!answer) return null;
  return { answer, sources };
}
