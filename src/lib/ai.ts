// ═══════════════════════════════════════════════════════════════
// Muse AI client — OpenRouter-backed (free + paid models).
// Replaces the old localhost Ollama/Qdrant dependency so the AI
// features actually work in serverless (Vercel) production.
//
// Two capabilities:
//   embedText()   — text → vector (embeddings endpoint)
//   chatComplete() — messages → completion (free/paid LLM)
//
// Configure via env:
//   OPENROUTER_API_KEY    (required — your key from openrouter.ai/keys)
//   OPENROUTER_EMBED_MODEL (default: openai/text-embedding-3-small)
//   OPENROUTER_CHAT_MODEL  (default: deepseek/deepseek-chat-v3-0324:free)
//
// Every call fails-soft: returns null when the key is missing or the
// request errors, so callers can fall back to rules-based logic.
// ═══════════════════════════════════════════════════════════════

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

const API_KEY = process.env.OPENROUTER_API_KEY || "";
const EMBED_MODEL = process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small";
const CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || "google/gemini-3.7-flash";

export function aiEnabled(): boolean {
  return API_KEY.length > 0;
}

export function aiModels(): { embed: string; chat: string } {
  return { embed: EMBED_MODEL, chat: CHAT_MODEL };
}

/** Text → embedding vector. Returns null if AI is disabled or the call fails. */
export async function embedText(text: string): Promise<number[] | null> {
  if (!API_KEY) return null;
  const cleaned = (text || "").trim().slice(0, 8000);
  if (!cleaned) return null;

  try {
    const resp = await fetch(`${OPENROUTER_BASE}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://muse.wyzdesign.com",
        "X-Title": "Muse",
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: cleaned }),
    });
    if (!resp.ok) {
      console.error("[muse:ai] embed failed:", resp.status, (await resp.text()).slice(0, 300));
      return null;
    }
    const data = await resp.json();
    const vector = data?.data?.[0]?.embedding;
    return Array.isArray(vector) && vector.length > 0 ? vector : null;
  } catch (e) {
    console.error("[muse:ai] embed error:", e);
    return null;
  }
}

/** Chat completion. Returns the assistant text or null on failure. */
export async function chatComplete(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string | null> {
  if (!API_KEY) return null;

  try {
    const resp = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://muse.wyzdesign.com",
        "X-Title": "Muse",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 600,
        temperature: opts.temperature ?? 0.4,
      }),
    });
    if (!resp.ok) {
      console.error("[muse:ai] chat failed:", resp.status, (await resp.text()).slice(0, 300));
      return null;
    }
    const data = await resp.json();
    let text = data?.choices?.[0]?.message?.content;
    // Reasoning models (e.g. Gemini Flash) may emit the final answer in
    // content and intermediate reasoning separately; content is the answer.
    if (typeof text !== "string" || !text.trim()) {
      text = data?.choices?.[0]?.message?.reasoning;
    }
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (e) {
    console.error("[muse:ai] chat error:", e);
    return null;
  }
}

/** Cosine similarity between two same-length vectors (0..1). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
