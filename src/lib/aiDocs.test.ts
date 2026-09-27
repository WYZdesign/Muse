import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSb, tableCalls, type SbCall } from "@/test-support/sb";

const aiMock = vi.hoisted(() => ({
  embedText: vi.fn(),
  aiEnabled: vi.fn(() => true),
  chatComplete: vi.fn(),
  cosineSimilarity: vi.fn((a: number[], b: number[]) => {
    let d = 0;
    for (let i = 0; i < a.length; i++) d += a[i] * b[i];
    return d;
  }),
}));
vi.mock("@/lib/ai", () => ({
  embedText: aiMock.embedText,
  aiEnabled: aiMock.aiEnabled,
  chatComplete: aiMock.chatComplete,
  cosineSimilarity: aiMock.cosineSimilarity,
}));
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
}));

import { MUSE_KNOWLEDGE_BASE, museSystemPrompt, seedKnowledgeBase, retrieveContext, askMuseAI } from "./aiDocs";

interface AiDocsState { docs: any[] | null; existing: any; }
const aiDocsState: AiDocsState = { docs: null, existing: null };

function selectArgs(calls: SbCall[]): any[] {
  return [...calls].reverse().find((c) => c.method === "select")?.args ?? [];
}

function installSb(throwTables: string[] = []) {
  (globalThis as any).__sbMock = createSb((table, calls) => {
    if (throwTables.includes(table)) throw new Error("boom");
    const mutation = calls.find((c) => ["insert", "update", "upsert"].includes(c.method));
    if (mutation) return { data: null, error: null };
    if (table === "muse_ai_docs") {
      const sel = selectArgs(calls);
      if (typeof sel[0] === "string" && sel[0].includes("section, title, content, embedding")) {
        return { data: aiDocsState.docs, error: null };
      }
      if (Array.isArray(sel[0]) && sel[0].includes("embedding")) {
        return { data: aiDocsState.docs, error: null };
      }
      return { data: aiDocsState.existing, error: null };
    }
    return { data: null, error: null };
  });
}

beforeEach(() => {
  aiDocsState.docs = null;
  aiDocsState.existing = null;
  aiMock.embedText.mockReset();
  aiMock.aiEnabled.mockReset().mockReturnValue(true);
  aiMock.chatComplete.mockReset();
  aiMock.cosineSimilarity.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  installSb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MUSE_KNOWLEDGE_BASE", () => {
  it("has a comprehensive set of docs", () => {
    expect(MUSE_KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(15);
  });

  it("covers the critical sections", () => {
    const sections = new Set(MUSE_KNOWLEDGE_BASE.map((d) => d.section));
    for (const required of ["about", "bookings", "safety", "moderation", "verification", "legal", "support", "disclosures"]) {
      expect(sections.has(required)).toBe(true);
    }
  });

  it("has title + content for every doc", () => {
    for (const d of MUSE_KNOWLEDGE_BASE) {
      expect(d.title.trim().length).toBeGreaterThan(0);
      expect(d.content.trim().length).toBeGreaterThan(20);
    }
  });

  it("has unique titles (used as upsert key)", () => {
    const titles = MUSE_KNOWLEDGE_BASE.map((d) => d.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("museSystemPrompt", () => {
  it("identifies the platform and support channel", () => {
    const p = museSystemPrompt();
    expect(p).toContain("Muse");
    expect(p).toContain("muse.wyzdesign.com");
    expect(p).toContain("info@wyzdesign.com");
  });

  it("instructs against inventing features", () => {
    expect(museSystemPrompt()).toContain("Never invent");
  });
});

describe("seedKnowledgeBase", () => {
  it("skips docs that already have a stored embedding", async () => {
    aiDocsState.existing = { id: "x", embedding: [0.1, 0.2], updated_at: "2026-01-01" };
    const r = await seedKnowledgeBase();
    expect(r).toEqual({ embedded: 0, skipped: MUSE_KNOWLEDGE_BASE.length });
    expect(aiMock.embedText).not.toHaveBeenCalled();
  });

  it("embeds and upserts each doc when no embedding exists", async () => {
    aiDocsState.existing = null;
    aiMock.embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    const r = await seedKnowledgeBase();
    expect(r).toEqual({ embedded: MUSE_KNOWLEDGE_BASE.length, skipped: 0 });
    const upserts = tableCalls((globalThis as any).__sbMock.__log, "muse_ai_docs")
      .filter((c) => c.method === "upsert");
    expect(upserts).toHaveLength(MUSE_KNOWLEDGE_BASE.length);
    expect(upserts[0].args[0]).toHaveProperty("embedding");
    expect(typeof upserts[0].args[0].updated_at).toBe("string");
  });

  it("skips a doc when the embedding call returns null", async () => {
    aiDocsState.existing = null;
    aiMock.embedText.mockResolvedValue(null);
    const r = await seedKnowledgeBase();
    expect(r).toEqual({ embedded: 0, skipped: 0 });
    const upserts = tableCalls((globalThis as any).__sbMock.__log, "muse_ai_docs")
      .filter((c) => c.method === "upsert");
    expect(upserts).toHaveLength(0);
  });

  it("catches per-doc failures and continues", async () => {
    installSb(["muse_ai_docs"]);
    aiMock.embedText.mockResolvedValue([1]);
    const r = await seedKnowledgeBase();
    expect(r).toEqual({ embedded: 0, skipped: 0 });
  });
});

describe("retrieveContext", () => {
  it("falls back to keyword retrieval over the in-memory KB when the DB is empty", async () => {
    aiDocsState.docs = [];
    const r = await retrieveContext("How do bookings and payments work?");
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.context).toContain("Bookings and sessions");
    expect(r.context).toContain(":");
  });

  it("returns the about + support defaults when nothing matches", async () => {
    aiDocsState.docs = null;
    const r = await retrieveContext("zzzznomatchzzzz");
    expect(r.sources).toContain("What is Muse");
    expect(r.sources).toContain("Support and help");
  });

  it("returns the first N stored docs when embeddings are unavailable", async () => {
    aiDocsState.docs = [
      { section: "a", title: "Doc A", content: "ca", embedding: [1, 0] },
      { section: "b", title: "Doc B", content: "cb", embedding: [0, 1] },
      { section: "c", title: "Doc C", content: "cc", embedding: [1, 1] },
    ];
    aiMock.embedText.mockResolvedValue(null);
    const r = await retrieveContext("anything", 2);
    expect(r.sources).toEqual(["Doc A", "Doc B"]);
  });

  it("ranks stored docs by cosine similarity to the query vector", async () => {
    aiDocsState.docs = [
      { section: "a", title: "Far", content: "ca", embedding: [0, 1] },
      { section: "b", title: "Near", content: "cb", embedding: [1, 0] },
      { section: "c", title: "Wrong dimension", content: "cc", embedding: [1, 0, 0] },
    ];
    aiMock.embedText.mockResolvedValue([1, 0]);
    const r = await retrieveContext("query", 5);
    expect(r.sources[0]).toBe("Near");
    expect(r.sources).not.toContain("Wrong dimension");
  });
});

describe("askMuseAI", () => {
  it("returns null when AI is disabled", async () => {
    aiMock.aiEnabled.mockReturnValue(false);
    expect(await askMuseAI("hello?")).toBeNull();
    expect(aiMock.chatComplete).not.toHaveBeenCalled();
  });

  it("returns the model answer with its sources", async () => {
    aiDocsState.docs = null;
    aiMock.chatComplete.mockResolvedValue("Here is your answer.");
    const r = await askMuseAI("How do I book a session?");
    expect(r?.answer).toBe("Here is your answer.");
    expect(r?.sources.length).toBeGreaterThan(0);
  });

  it("returns null when the completion comes back empty", async () => {
    aiDocsState.docs = null;
    aiMock.chatComplete.mockResolvedValue(null);
    expect(await askMuseAI("hello?")).toBeNull();
  });

  it("adds the admin preamble for admin callers", async () => {
    aiDocsState.docs = null;
    aiMock.chatComplete.mockResolvedValue("ok");
    await askMuseAI("metrics?", { forAdmin: true });
    const messages = aiMock.chatComplete.mock.calls[0][0];
    expect(messages[0].content).toContain("owner/admin");
  });
});
