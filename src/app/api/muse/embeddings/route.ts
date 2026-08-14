import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { embedText, cosineSimilarity, aiEnabled } from "@/lib/ai";

/**
 * Muse Embeddings API — OpenRouter + Supabase (replaces Ollama + Qdrant).
 * Actions: embed, search, batch-embed, info.
 * Vectors are cached on muse_profiles.embedding; search is free (JS cosine).
 */
export async function POST(req: NextRequest) {
  try {
    if (!checkRate(clientIp(req), "embeddings", 30)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── EMBED: text → vector via OpenRouter ──
    if (action === "embed") {
      const { text } = body;
      if (!text || typeof text !== "string") return NextResponse.json({ error: "text required" }, { status: 400 });
      if (!aiEnabled()) return NextResponse.json({ error: "AI not enabled" }, { status: 503 });
      const vector = await embedText(text);
      if (!vector) return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
      return NextResponse.json({ vector, dims: vector.length });
    }

    // ── SEARCH: cosine similarity against cached profile embeddings ──
    if (action === "search") {
      const { vector, excludeUserId, limit, minScore } = body;
      if (!vector || !Array.isArray(vector)) return NextResponse.json({ error: "vector required" }, { status: 400 });

      const sb = getServiceClient();
      const { data: profiles } = await sb.from("muse_profiles")
        .select("id, name, type, embedding")
        .not("embedding", "is", null)
        .limit(500);

      const results = (profiles || [])
        .filter((p: any) => String(p.id) !== String(excludeUserId) && Array.isArray(p.embedding) && p.embedding.length === vector.length)
        .map((p: any) => ({ userId: p.id, name: p.name, type: p.type, score: cosineSimilarity(vector, p.embedding) }))
        .filter((r) => r.score >= (minScore || 0.3))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(limit || 10, 50));

      return NextResponse.json({ results });
    }

    // ── BATCH-EMBED: multiple texts at once ──
    if (action === "batch-embed") {
      const { texts } = body;
      if (!Array.isArray(texts) || texts.length === 0) return NextResponse.json({ error: "texts array required" }, { status: 400 });
      if (texts.length > 20) return NextResponse.json({ error: "Max 20 texts per batch" }, { status: 400 });
      if (!aiEnabled()) return NextResponse.json({ error: "AI not enabled" }, { status: 503 });

      const vectors: number[][] = [];
      for (const t of texts) {
        const v = await embedText(t);
        if (!v) return NextResponse.json({ error: `Embedding failed at index ${vectors.length}` }, { status: 502 });
        vectors.push(v);
      }
      return NextResponse.json({ vectors });
    }

    // ── INFO: embedding coverage stats ──
    if (action === "info") {
      const sb = getServiceClient();
      const { count: total } = await sb.from("muse_profiles").select("*", { count: "exact", head: true });
      const { count: embedded } = await sb.from("muse_profiles").select("*", { count: "exact", head: true }).not("embedded_at", "is", null);
      return NextResponse.json({ aiEnabled: aiEnabled(), totalProfiles: total || 0, embeddedProfiles: embedded || 0 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
