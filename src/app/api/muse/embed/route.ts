import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { embedText, aiEnabled } from "@/lib/ai";
import { seedKnowledgeBase } from "@/lib/aiDocs";

/**
 * Muse Embedding Pipeline — OpenRouter + Supabase (replaces Ollama + Qdrant).
 * Embeddings are stored on muse_profiles.embedding (JSONB) so matching is a
 * free read + JS cosine. Actions:
 *   embed-profile  — embed a single profile and cache it
 *   embed-all      — (admin) re-embed all profiles
 *   status         — embedding coverage stats
 */
export async function POST(req: NextRequest) {
  try {
    if (!checkRate(clientIp(req), "embed", 30)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const header = req.headers.get("authorization") || "";
    const bearer = header.replace(/^Bearer\s+/i, "").trim();
    if (!bearer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: authData } = await supabase.auth.getUser(bearer);
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: profile } = await sb.from("muse_profiles").select("id, name, email, tier").eq("auth_id", authData.user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    async function buildProfileText(profId: string): Promise<{ text: string; prof: any }> {
      const { data: prof } = await sb.from("muse_profiles").select("*").eq("id", profId).maybeSingle();
      if (!prof) return { text: "", prof: null };
      const parts: string[] = [];
      if (prof.name) parts.push(`Name: ${prof.name}`);
      if (prof.type) parts.push(`Creative type: ${prof.type}`);
      if (prof.bio) parts.push(`Bio: ${prof.bio}`);
      if (prof.loc) parts.push(`Location: ${prof.loc}`);
      if (prof.styles?.length) parts.push(`Styles: ${prof.styles.join(", ")}`);
      if (prof.looking?.length) parts.push(`Looking for: ${prof.looking.join(", ")}`);
      if (prof.zodiac) parts.push(`Zodiac: ${prof.zodiac}`);
      if (prof.mbti) parts.push(`MBTI: ${prof.mbti}`);

      const { data: responses } = await sb.from("muse_prompt_responses")
        .select("response_text, prompt_id(prompt_text)")
        .eq("user_id", profId)
        .limit(20);
      if (responses?.length) {
        const qTexts = responses
          .filter((r: any) => r.response_text)
          .map((r: any) => `${r.prompt_id?.prompt_text || ""} ${r.response_text}`);
        if (qTexts.length) parts.push(`Prompt answers: ${qTexts.join(" | ")}`);
      }
      return { text: parts.join(". ").trim(), prof };
    }

    async function embedAndStore(profId: string): Promise<{ ok: boolean; dims?: number; error?: string }> {
      const { text } = await buildProfileText(profId);
      if (!text) return { ok: false, error: "No data to embed" };
      const vector = await embedText(text);
      if (!vector) return { ok: false, error: aiEnabled() ? "Embedding failed" : "AI not enabled (missing OPENROUTER_API_KEY)" };
      await sb.from("muse_profiles").update({
        embedding: vector,
        embedding_model: "openrouter",
        embedded_at: new Date().toISOString(),
      }).eq("id", profId);
      return { ok: true, dims: vector.length };
    }

    // ── embed-profile ──
    if (action === "embed-profile") {
      // Only the caller's own profile (or an admin) — prevent using this as a
      // free way to spend OpenRouter budget embedding arbitrary profiles.
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
      const isAdmin = admins.includes((profile.email || "").toLowerCase());
      const targetId = isAdmin ? (body.userId || profile.id) : profile.id;
      const r = await embedAndStore(targetId);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ success: true, dims: r.dims });
    }

    // ── embed-all (admin) ──
    if (action === "embed-all") {
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
      if (!admins.includes((profile.email || "").toLowerCase())) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
      if (!aiEnabled()) return NextResponse.json({ error: "AI not enabled (missing OPENROUTER_API_KEY)" }, { status: 503 });

      const { data: profiles } = await sb.from("muse_profiles").select("id").limit(500);
      if (!profiles?.length) return NextResponse.json({ profiles: 0 });

      let embedded = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const p of profiles) {
        const r = await embedAndStore(p.id);
        if (r.ok) embedded++;
        else { failed++; if (errors.length < 10) errors.push(`${p.id}: ${r.error}`); }
      }
      return NextResponse.json({ embedded, failed, total: profiles.length, errors });
    }

    // ── seed-kb (admin) — one-time embed of the Muse knowledge base ──
    if (action === "seed-kb") {
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
      if (!admins.includes((profile.email || "").toLowerCase())) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
      if (!aiEnabled()) return NextResponse.json({ error: "AI not enabled (missing OPENROUTER_API_KEY)" }, { status: 503 });
      const r = await seedKnowledgeBase();
      return NextResponse.json(r);
    }

    // ── status ──
    if (action === "status") {
      const { count: total } = await sb.from("muse_profiles").select("*", { count: "exact", head: true });
      const { count: embedded } = await sb.from("muse_profiles").select("*", { count: "exact", head: true }).not("embedded_at", "is", null);
      const { count: docs } = await sb.from("muse_ai_docs").select("*", { count: "exact", head: true });
      return NextResponse.json({ totalProfiles: total || 0, embeddedProfiles: embedded || 0, knowledgeBaseDocs: docs || 0, aiEnabled: aiEnabled() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    console.error("[embed] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
