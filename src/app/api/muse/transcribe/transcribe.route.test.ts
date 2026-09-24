import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
  checkRateUser: vi.fn(async () => true),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => (globalThis as any).__authUser || { data: { user: null }, error: null }),
    },
  },
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => (globalThis as any).__profile || { data: null, error: null },
        }),
      }),
    })),
  })),
}));

import { POST } from "@/app/api/muse/transcribe/route";
import { checkRate } from "@/lib/rate-limit";

function mockReq(opts: {
  headers?: Record<string, string>;
  file?: File | null;
} = {}) {
  return {
    headers: {
      get: (n: string) => opts.headers?.[n] ?? null,
    },
    formData: async () => {
      const fd = new FormData();
      if (opts.file) fd.set("file", opts.file);
      return fd;
    },
  } as any;
}

function audioFile(size = 100) {
  const buf = new Uint8Array(size);
  return new File([buf], "voice.webm", { type: "audio/webm" });
}

describe("transcribe route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    (globalThis as any).__authUser = { data: { user: { id: "auth-1" } }, error: null };
    (globalThis as any).__profile = { data: { id: "p1", suspended: false }, error: null };
  });

  it("409 in demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await POST(mockReq());
    expect(r.status).toBe(409);
    expect((await r.json()).code).toBe("DEMO_MODE");
  });

  it("503 when GROQ_API_KEY missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" } }));
    expect(r.status).toBe(503);
    expect((await r.json()).error).toBe("transcription_not_configured");
  });

  it("401 without bearer", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    const r = await POST(mockReq());
    expect(r.status).toBe(401);
  });

  it("401 when auth fails", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    (globalThis as any).__authUser = { data: { user: null }, error: { message: "bad" } };
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" } }));
    expect(r.status).toBe(401);
  });

  it("404 when profile missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    (globalThis as any).__profile = { data: null, error: null };
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" } }));
    expect(r.status).toBe(404);
  });

  it("403 when suspended", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    (globalThis as any).__profile = { data: { id: "p1", suspended: true }, error: null };
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" } }));
    expect(r.status).toBe(403);
  });

  it("429 when rate limited", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: audioFile() }));
    expect(r.status).toBe(429);
  });

  it("400 without audio file", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: null }));
    expect(r.status).toBe(400);
  });

  it("400 when clip too large", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    const r = await POST(
      mockReq({ headers: { authorization: "Bearer tok" }, file: audioFile(25 * 1024 * 1024 + 1) }),
    );
    expect(r.status).toBe(400);
  });

  it("returns transcript on Groq success", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ text: "  hello world  " }), { status: 200 }),
    );
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: audioFile() }));
    spy.mockRestore();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ transcript: "hello world" });
  });

  it("502 when Groq fails", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("boom", { status: 500 }),
    );
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: audioFile() }));
    spy.mockRestore();
    expect(r.status).toBe(502);
  });
});
