import { NextRequest, NextResponse } from "next/server";
import { supabase, getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION = "muse_embeddings";

/**
 * Muse Embeddings Pipeline — auto-embed profiles & prompt responses.
 * POST /api/muse/embed  { action: "embed-profile" | "embed-response" | "embed-all" | "rebuild-index" }
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

    const body = await req.json();
    const { action } = body;

    // ═══ EMBED-PROFILE: Build and store a user's profile embedding ═══
    if (action === "embed-profile") {
      const { userId } = body;
      const targetId = userId || profile.id;

      // Fetch full profile for embedding
      const { data: prof } = await sb.from("muse_profiles").select("*").eq("id", targetId).maybeSingle();
      if (!prof) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

      // Build embedding text from profile data
      const parts: string[] = [];
      if (prof.name) parts.push(`Name: ${prof.name}`);
      if (prof.type) parts.push(`Creative type: ${prof.type}`);
      if (prof.bio) parts.push(`Bio: ${prof.bio}`);
      if (prof.loc) parts.push(`Location: ${prof.loc}`);
      if (prof.styles?.length) parts.push(`Styles: ${prof.styles.join(", ")}`);
      if (prof.looking?.length) parts.push(`Looking for: ${prof.looking.join(", ")}`);
      if (prof.zodiac) parts.push(`Zodiac: ${prof.zodiac}`);
      if (prof.mbti) parts.push(`MBTI: ${prof.mbti}`);

      // Fetch prompt responses for richer embedding
      const { data: responses } = await sb.from("muse_prompt_responses")
        .select("response_text, prompt_id(prompt_text)")
        .eq("user_id", targetId)
        .limit(20);

      if (responses?.length) {
        const promptTexts = responses
          .filter((r: any) => r.response_text)
          .map((r: any) => {
            const qText = r.prompt_id?.prompt_text || "";
            return `${qText} ${r.response_text}`;
          });
        if (promptTexts.length) parts.push(`Prompt answers: ${promptTexts.join(" | ")}`);
      }

      const embedText = parts.join(". ");
      if (!embedText) return NextResponse.json({ error: "No data to embed" }, { status: 400 });

      // Embed via Ollama
      const embedResp = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "nomic-embed-text", prompt: embedText }),
      });
      if (!embedResp.ok) return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
      const embedData = await embedResp.json();
      const vector = embedData.embedding as number[];
      if (!vector || vector.length !== 768) return NextResponse.json({ error: `Expected 768-dim, got ${vector?.length}` }, { status: 500 });

      // Store in Qdrant
      const pointId = hashToUint64(`profile:${targetId}`);
      const qdrantResp = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: [{
            id: pointId,
            vector,
            payload: {
              user_id: targetId,
              embedding_type: "profile",
              text_source: embedText.slice(0, 2000),
              name: prof.name,
              type: prof.type,
              styles: prof.styles || [],
              looking: prof.looking || [],
              loc: prof.loc,
              updated_at: new Date().toISOString(),
            },
          }],
        }),
      });
      if (!qdrantResp.ok) {
        const err = await qdrantResp.text();
        return NextResponse.json({ error: `Qdrant store failed: ${err.slice(0, 200)}` }, { status: 502 });
      }

      return NextResponse.json({ success: true, textLength: embedText.length, dims: vector.length });
    }

    // ═══ EMBED-RESPONSE: Embed a single prompt response and store ═══
    if (action === "embed-response") {
      const { promptId, responseText, userId } = body;
      const targetId = userId || profile.id;
      if (!promptId || !responseText) return NextResponse.json({ error: "promptId and responseText required" }, { status: 400 });

      // Fetch the prompt question text
      const { data: prompt } = await sb.from("muse_prompt_bank").select("prompt_text, category").eq("id", promptId).maybeSingle();
      const embedText = `${prompt?.category || ""} ${prompt?.prompt_text || ""} ${responseText}`.trim();

      const embedResp = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "nomic-embed-text", prompt: embedText }),
      });
      if (!embedResp.ok) return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
      const embedData = await embedResp.json();
      const vector = embedData.embedding as number[];
      if (!vector || vector.length !== 768) return NextResponse.json({ error: `Expected 768-dim, got ${vector?.length}` }, { status: 500 });

      const pointId = hashToUint64(`response:${targetId}:${promptId}`);
      const qdrantResp = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: [{
            id: pointId,
            vector,
            payload: {
              user_id: targetId,
              embedding_type: "prompt_response",
              prompt_id: promptId,
              text_source: embedText.slice(0, 2000),
              category: prompt?.category,
              updated_at: new Date().toISOString(),
            },
          }],
        }),
      });
      if (!qdrantResp.ok) return NextResponse.json({ error: "Qdrant store failed" }, { status: 502 });

      return NextResponse.json({ success: true, textLength: embedText.length });
    }

    // ═══ EMBED-ALL: Re-embed all profiles (admin only) ═══
    if (action === "embed-all") {
      const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
      if (!admins.includes((profile.email || "").toLowerCase())) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }

      const { data: profiles } = await sb.from("muse_profiles").select("id").limit(500);
      if (!profiles?.length) return NextResponse.json({ profiles: 0 });

      let embedded = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const p of profiles) {
        try {
          const { data: prof } = await sb.from("muse_profiles").select("*").eq("id", p.id).maybeSingle();
          if (!prof) { failed++; continue; }

          const parts: string[] = [];
          if (prof.name) parts.push(`Name: ${prof.name}`);
          if (prof.type) parts.push(`Creative type: ${prof.type}`);
          if (prof.bio) parts.push(`Bio: ${prof.bio}`);
          if (prof.styles?.length) parts.push(`Styles: ${prof.styles.join(", ")}`);
          if (prof.looking?.length) parts.push(`Looking for: ${prof.looking.join(", ")}`);

          const { data: responses } = await sb.from("muse_prompt_responses")
            .select("response_text, prompt_id(prompt_text)")
            .eq("user_id", p.id).limit(20);

          if (responses?.length) {
            const qTexts = responses
              .filter((r: any) => r.response_text)
              .map((r: any) => `${r.prompt_id?.prompt_text || ""} ${r.response_text}`);
            if (qTexts.length) parts.push(`Prompts: ${qTexts.join(" | ")}`);
          }

          const text = parts.join(". ");
          if (!text) { failed++; continue; }

          const embedResp = await fetch(`${OLLAMA_URL}/api/embeddings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
          });
          if (!embedResp.ok) { failed++; errors.push(`${p.id}: embed failed`); continue; }
          const { embedding } = await embedResp.json();
          if (!embedding?.length) { failed++; continue; }

          const pointId = hashToUint64(`profile:${p.id}`);
          await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              points: [{ id: pointId, vector: embedding, payload: { user_id: p.id, embedding_type: "profile", text_source: text.slice(0, 2000), updated_at: new Date().toISOString() } }],
            }),
          });
          embedded++;
        } catch (err) {
          failed++;
          errors.push(`${p.id}: ${err instanceof Error ? err.message : "unknown"}`);
        }
      }

      return NextResponse.json({ embedded, failed, total: profiles.length, errors: errors.slice(0, 10) });
    }

    // ═══ REBUILD-INDEX: Get Qdrant collection info ═══
    if (action === "rebuild-index") {
      const resp = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`);
      if (!resp.ok) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      const data = await resp.json();
      return NextResponse.json({ collection: data.result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

function hashToUint64(str: string): number {
  let hash = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");
  const mask = BigInt("0xffffffffffffffff");
  const positiveMask = BigInt("0x7fffffffffffffff");
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return Number(hash & positiveMask);
}
