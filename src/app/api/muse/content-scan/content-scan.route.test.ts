import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async () => true),
  clientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/contentScan", () => ({
  scanWithRekognition: vi.fn(async () => (globalThis as any).__scanResult),
  logScan: vi.fn(async () => undefined),
  reportIncident: vi.fn(async () => undefined),
  escalateToNcmec: vi.fn(async () => undefined),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async (token: string) =>
        token === "bad"
          ? { data: { user: null }, error: { message: "bad" } }
          : { data: { user: { id: "auth-1" } }, error: null },
      ),
    },
  },
  getServiceClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => (globalThis as any).__profile || { data: null, error: null },
        }),
      }),
    }),
  })),
}));

import { POST } from "@/app/api/muse/content-scan/route";
import { checkRate } from "@/lib/rate-limit";
import { scanWithRekognition, logScan, reportIncident, escalateToNcmec } from "@/lib/contentScan";

function safeResult() {
  return {
    safe: true,
    scanned: true,
    flaggedCategories: [],
    confidence: 99,
    shouldBlock: false,
    shouldReport: false,
    isCSAM: false,
    details: [],
  };
}

function mockReq(opts: {
  headers?: Record<string, string>;
  file?: File | null;
  context?: string;
} = {}) {
  return {
    headers: { get: (n: string) => opts.headers?.[n] ?? null },
    formData: async () => {
      const fd = new FormData();
      if (opts.file) fd.set("file", opts.file);
      if (opts.context) fd.set("context", opts.context);
      return fd;
    },
  } as any;
}

function imageFile(type = "image/jpeg", size = 10) {
  return new File([new Uint8Array(size)], "x.jpg", { type });
}

describe("content-scan route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MUSE_DEMO_MODE", "false");
    (globalThis as any).__authUser = { data: { user: { id: "auth-1" } }, error: null };
    (globalThis as any).__profile = { data: { id: "p1" }, error: null };
    (globalThis as any).__scanResult = safeResult();
    (scanWithRekognition as any).mockImplementation(async () => (globalThis as any).__scanResult);
  });

  it("409 demo mode", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: imageFile() }));
    expect(r.status).toBe(409);
  });

  it("401 without auth", async () => {
    const r = await POST(mockReq({ file: imageFile() }));
    expect(r.status).toBe(401);
  });

  it("401 on invalid auth", async () => {
    const r = await POST(mockReq({ headers: { authorization: "Bearer bad" }, file: imageFile() }));
    expect(r.status).toBe(401);
  });

  it("429 when rate limited", async () => {
    (checkRate as any).mockResolvedValueOnce(false);
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: imageFile() }));
    expect(r.status).toBe(429);
  });

  it("400 without file", async () => {
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: null }));
    expect(r.status).toBe(400);
  });

  it("400 on disallowed mime", async () => {
    const r = await POST(
      mockReq({ headers: { authorization: "Bearer tok" }, file: imageFile("application/pdf") }),
    );
    expect(r.status).toBe(400);
  });

  it("400 on oversized file", async () => {
    const big = imageFile();
    Object.defineProperty(big, "size", { value: 60 * 1024 * 1024 });
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: big }));
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.allowed).toBe(false);
  });

  it("allows safe scan and logs", async () => {
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: imageFile() }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.allowed).toBe(true);
    expect(logScan).toHaveBeenCalled();
    expect(reportIncident).not.toHaveBeenCalled();
    expect(escalateToNcmec).not.toHaveBeenCalled();
  });

  it("403 on shouldBlock and reports incident", async () => {
    (globalThis as any).__scanResult = {
      ...safeResult(),
      safe: false,
      shouldBlock: true,
      shouldReport: true,
      flaggedCategories: ["Violence"],
    };
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: imageFile() }));
    expect(r.status).toBe(403);
    const body = await r.json();
    expect(body.allowed).toBe(false);
    expect(body.flaggedCategories).toContain("Violence");
    expect(reportIncident).toHaveBeenCalled();
    expect(escalateToNcmec).not.toHaveBeenCalled();
  });

  it("escalates CSAM instead of generic report", async () => {
    (globalThis as any).__scanResult = {
      ...safeResult(),
      safe: false,
      shouldBlock: true,
      shouldReport: true,
      isCSAM: true,
      flaggedCategories: ["Child Sexual Abuse"],
    };
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: imageFile() }));
    expect(r.status).toBe(403);
    expect(escalateToNcmec).toHaveBeenCalled();
    expect(reportIncident).not.toHaveBeenCalled();
  });

  it("503 when scan pipeline throws (fail-closed)", async () => {
    (scanWithRekognition as any).mockRejectedValueOnce(new Error("rek down"));
    const r = await POST(mockReq({ headers: { authorization: "Bearer tok" }, file: imageFile() }));
    expect(r.status).toBe(503);
    const body = await r.json();
    expect(body.allowed).toBe(false);
  });
});
