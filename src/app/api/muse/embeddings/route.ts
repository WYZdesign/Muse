import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION = "muse_embeddings";

/**
 * Muse Embeddings API — nomic-embed-text via Ollama, stored in Qdrant.
 * Handles: embed (text → vector), store, search (cosine similarity), batch embed.
 * Collection: muse_embeddings (768-dim, Cosine distance)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── EMBED: text → 768-dim vector via nomic-embed-text ──
    if (action === "embed") {
      const { text } = body;
      if (!text || typeof text !== "string") return NextResponse.json({ error: "text required" }, { status: 400 });
      const resp = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
      });
      if (!resp.ok) return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
      const data = await resp.json();
      const vector = data.embedding as number[];
      if (!vector || vector.length !== 768) return NextResponse.json({ error: `Expected 768-dim, got ${vector?.length}` }, { status: 500 });
      return NextResponse.json({ vector });
    }

    // ── STORE: save a user's profile/bio/prompt embedding ──
    if (action === "store") {
      const { userId, embeddingType, textSource, vector, metadata } = body;
      if (!userId || !vector || !Array.isArray(vector)) return NextResponse.json({ error: "userId and vector required" }, { status: 400 });
      if (vector.length !== 768) return NextResponse.json({ error: `Expected 768-dim, got ${vector.length}` }, { status: 400 });

      const pointId = hashToUint64(`${userId}:${embeddingType || "profile"}`);
      const resp = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: [{
            id: pointId,
            vector,
            payload: {
              user_id: userId,
              embedding_type: embeddingType || "profile",
              text_source: (textSource || "").slice(0, 2000),
              ...metadata,
            },
          }],
        }),
      });
      if (!resp.ok) return NextResponse.json({ error: "Qdrant store failed" }, { status: 502 });
      return NextResponse.json({ success: true });
    }

    // ── SEARCH: find similar profiles by cosine similarity ──
    if (action === "search") {
      const { vector, excludeUserId, limit, minScore } = body;
      if (!vector || !Array.isArray(vector)) return NextResponse.json({ error: "vector required" }, { status: 400 });
      const resp = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vector,
          limit: Math.min(limit || 10, 20),
          score_threshold: minScore || 0.5,
          with_payload: true,
          filter: excludeUserId ? {
            must: [{ key: "user_id", match: { value: excludeUserId, except: true } }],
          } : undefined,
        }),
      });
      if (!resp.ok) return NextResponse.json({ error: "Qdrant search failed" }, { status: 502 });
      const data = await resp.json();
      const results = (data.result || []).map((r: any) => ({
        userId: r.payload?.user_id,
        score: r.score,
        embeddingType: r.payload?.embedding_type,
        textSource: r.payload?.text_source?.slice(0, 200),
      }));
      return NextResponse.json({ results });
    }

    // ── BATCH-EMBED: embed multiple texts at once ──
    if (action === "batch-embed") {
      const { texts } = body;
      if (!Array.isArray(texts) || texts.length === 0) return NextResponse.json({ error: "texts array required" }, { status: 400 });
      if (texts.length > 20) return NextResponse.json({ error: "Max 20 texts per batch" }, { status: 400 });

      const vectors: number[][] = [];
      for (const text of texts) {
        const resp = await fetch(`${OLLAMA_URL}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
        });
        if (!resp.ok) return NextResponse.json({ error: `Embedding failed for text index ${vectors.length}` }, { status: 502 });
        const data = await resp.json();
        vectors.push(data.embedding);
      }
      return NextResponse.json({ vectors });
    }

    // ── COLLECTION INFO ──
    if (action === "info") {
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

/** Deterministic uint64 hash from a string — safe for Qdrant point IDs */
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
