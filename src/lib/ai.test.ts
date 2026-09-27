import { describe, it, expect, vi, afterEach } from "vitest";
import { cosineSimilarity, aiModels } from "./ai";

async function loadAi(env: Record<string, string>): Promise<typeof import("./ai")> {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return await import("./ai");
}

function okJson(body: any): any {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
}
function bad(status: number, text = "nope"): any {
  return { ok: false, status, json: async () => ({}), text: async () => text };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("returns 0 for empty or mismatched-length vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [])).toBe(0);
  });

  it("returns 0 when a vector is all zeros", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("returns a value in [-1, 1] for arbitrary vectors", () => {
    const a = [1, 2, 3, 4];
    const b = [4, 3, 2, 1];
    const s = cosineSimilarity(a, b);
    expect(s).toBeGreaterThanOrEqual(-1);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe("aiModels", () => {
  it("returns default model ids", () => {
    const m = aiModels();
    expect(m.embed).toContain("text-embedding");
    expect(m.chat).toContain("gemini");
  });
});

describe("aiEnabled", () => {
  it("is false without an OPENROUTER_API_KEY", async () => {
    const mod = await loadAi({});
    expect(mod.aiEnabled()).toBe(false);
  });

  it("is true once a key is configured, and honors model overrides", async () => {
    const mod = await loadAi({
      OPENROUTER_API_KEY: "sk-or-test",
      OPENROUTER_EMBED_MODEL: "custom-embed",
      OPENROUTER_CHAT_MODEL: "custom-chat",
    });
    expect(mod.aiEnabled()).toBe(true);
    expect(mod.aiModels()).toEqual({ embed: "custom-embed", chat: "custom-chat" });
  });
});

describe("embedText", () => {
  it("returns null immediately when AI is disabled", async () => {
    const mod = await loadAi({});
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await mod.embedText("hello")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns null for blank input without calling the API", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await mod.embedText("   ")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("posts to the embeddings endpoint and returns the vector", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k", OPENROUTER_EMBED_MODEL: "m" });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ data: [{ embedding: [0.1, 0.2, 0.3] }] }));
    const out = await mod.embedText("  hello world  ");
    expect(out).toEqual([0.1, 0.2, 0.3]);
    const [url, opts] = spy.mock.calls[0] as any[];
    expect(url).toContain("/embeddings");
    expect(opts.headers.Authorization).toBe("Bearer k");
    expect(opts.headers["X-Title"]).toBe("Muse");
    expect(JSON.parse(opts.body)).toEqual({ model: "m", input: "hello world" });
  });

  it("truncates oversized input to 8000 chars before sending", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ data: [{ embedding: [1] }] }));
    await mod.embedText("x".repeat(9000));
    expect(JSON.parse((spy.mock.calls[0] as any[])[1].body).input).toHaveLength(8000);
  });

  it("returns null on a non-ok response", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(bad(429));
    expect(await mod.embedText("hi")).toBeNull();
  });

  it("returns null when the vector is missing or empty", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ data: [{}] }));
    expect(await mod.embedText("hi")).toBeNull();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ data: [{ embedding: [] }] }));
    expect(await mod.embedText("hi")).toBeNull();
  });

  it("fails soft (null) when fetch throws", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    expect(await mod.embedText("hi")).toBeNull();
  });
});

describe("chatComplete", () => {
  const messages = [{ role: "user" as const, content: "hi" }];

  it("returns null when AI is disabled", async () => {
    const mod = await loadAi({});
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await mod.chatComplete(messages)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns the trimmed assistant content and sends default params", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k", OPENROUTER_CHAT_MODEL: "cm" });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ choices: [{ message: { content: "  hello  " } }] }));
    expect(await mod.chatComplete(messages)).toBe("hello");
    const [url, opts] = spy.mock.calls[0] as any[];
    expect(url).toContain("/chat/completions");
    const body = JSON.parse(opts.body);
    expect(body.model).toBe("cm");
    expect(body.max_tokens).toBe(600);
    expect(body.temperature).toBe(0.4);
  });

  it("honors maxTokens/temperature overrides", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ choices: [{ message: { content: "ok" } }] }));
    await mod.chatComplete(messages, { maxTokens: 42, temperature: 0 });
    const body = JSON.parse((spy.mock.calls[0] as any[])[1].body);
    expect(body.max_tokens).toBe(42);
    expect(body.temperature).toBe(0);
  });

  it("falls back to the reasoning field for reasoning models", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ choices: [{ message: { content: "", reasoning: "  the answer  " } }] }));
    expect(await mod.chatComplete(messages)).toBe("the answer");
  });

  it("returns null when neither content nor reasoning is usable", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ choices: [{}] }));
    expect(await mod.chatComplete(messages)).toBeNull();
  });

  it("returns null on a non-ok response and fails soft on throw", async () => {
    const mod = await loadAi({ OPENROUTER_API_KEY: "k" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(bad(500));
    expect(await mod.chatComplete(messages)).toBeNull();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    expect(await mod.chatComplete(messages)).toBeNull();
  });
});
