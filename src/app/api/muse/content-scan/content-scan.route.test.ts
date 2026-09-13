import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: async (token: string) => (globalThis as any).__authUser || { data: { user: null } } } },
  getServiceClient: () => (globalThis as any).__sbMock,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/contentScan", () => ({
  scanWithRekognition: async () => ({
    safe: true, scanned: true, flaggedCategories: [], confidence: 0,
    shouldBlock: false, shouldReport: false, isCSAM: false, details: [],
  }),
  logScan: async () => {},
  reportIncident: async () => {},
  escalateToNcmec: async () => {},
}));

import { POST } from "@/app/api/muse/content-scan/route";

const state: any = { tables: { muse_profiles: { id: "p1" } } };
(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      insert: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: state.tables[tbl] ?? null }),
    };
    q.then = (resolve: any) => resolve({ data: state.tables[tbl] ?? null, error: null });
    return q;
  },
};

function req(formData: FormData, token = "tok") {
  return {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "authorization" ? "Bearer " + token : null,
    },
    formData: async () => formData,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).__authUser = { data: { user: { id: "u1" } } };
});

describe("content-scan route", () => {
  it("rejects missing auth with 401", async () => {
    (globalThis as any).__authUser = { data: { user: null } };
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(100)], { type: "image/jpeg" }), "test.jpg");
    const r = await POST(req(fd, ""));
    expect(r.status).toBe(401);
  });

  it("rejects no file with 400", async () => {
    const fd = new FormData();
    const r = await POST(req(fd));
    expect(r.status).toBe(400);
  });

  it("rejects disallowed file type", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(100)], { type: "application/pdf" }), "doc.pdf");
    const r = await POST(req(fd));
    expect(r.status).toBe(400);
  });

  it("accepts a valid JPEG for scanning", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(100)], { type: "image/jpeg" }), "photo.jpg");
    const r = await POST(req(fd));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.allowed).toBe(true);
  });

  it("rejects oversized files", async () => {
    const fd = new FormData();
    // 60MB file
    const bigBlob = new Blob([new Uint8Array(60 * 1024 * 1024)], { type: "image/jpeg" });
    fd.append("file", bigBlob, "huge.jpg");
    const r = await POST(req(fd));
    expect(r.status).toBe(400);
  });
});
