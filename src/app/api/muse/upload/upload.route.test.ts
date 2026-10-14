import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

type UploadTableValue = Record<string, unknown> | null;
type UploadSbQuery = {
  select: () => UploadSbQuery;
  insert: (v: Record<string, unknown>) => UploadSbQuery;
  update: (v: Record<string, unknown>) => UploadSbQuery;
  eq: () => UploadSbQuery;
  maybeSingle: () => Promise<{ data: UploadTableValue }>;
  then: (resolve: (v: { data: UploadTableValue; error: null }) => unknown) => unknown;
};
type UploadSbMock = {
  from: (tbl: string) => UploadSbQuery;
  storage: { from: () => { upload: () => Promise<{ data: { path: string }; error: null }>; getPublicUrl: () => { data: { publicUrl: string } } } };
};
type UploadTestGlobals = {
  __authUser?: { data: { user: { id: string } | null } };
  __sbMock?: UploadSbMock;
};

const TG = globalThis as unknown as UploadTestGlobals;

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: async (token: string) => (globalThis as unknown as UploadTestGlobals).__authUser || { data: { user: null } } } },
  getServiceClient: () => (globalThis as unknown as UploadTestGlobals).__sbMock,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/http", () => ({ safeServerError: (e: unknown, ctx: string) => ({ status: 500, json: async () => ({ error: `${ctx} failed` }) }) }));
vi.mock("@/lib/contentScan", () => ({
  scanWithRekognition: async () => ({ safe: true, scanned: true, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, isCSAM: false, details: [] }),
  // Second moderation engine (added alongside Rekognition) — must be present or
  // the route throws when it calls it.
  scanWithSightengine: async () => ({ safe: true, scanned: true, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, isCSAM: false, details: [] }),
  logScan: async () => {},
  startVideoModeration: async () => ({ jobId: "job_1" }),
  reportIncident: async () => {},
  escalateToNcmec: async () => {},
}));

import { POST } from "@/app/api/muse/upload/route";

const state: { tables: Record<string, UploadTableValue>; inserts: { tbl: string; v: Record<string, unknown> }[] } = { tables: { muse_profiles: { id: "p1" } }, inserts: [] };
TG.__sbMock = {
  from: (tbl: string) => {
    const q: UploadSbQuery = {
      select: () => q,
      insert: (v: Record<string, unknown>) => { state.inserts.push({ tbl, v }); return q; },
      update: (v: Record<string, unknown>) => q,
      eq: () => q,
      maybeSingle: async () => ({ data: state.tables[tbl] ?? null }),
      then: (resolve) => resolve({ data: state.tables[tbl] ?? null, error: null }),
    };
    return q;
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: { path: "uploads/test.jpg" }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "https://storage.test/test.jpg" } }),
    }),
  },
};

function req(formData: FormData, token = "tok") {
  return {
    headers: {
      get: (n: string) =>
        n.toLowerCase() === "authorization" ? "Bearer " + token : null,
    },
    formData: async () => formData,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  TG.__authUser = { data: { user: { id: "u1" } } };
  state.inserts = [];
});

describe("upload route", () => {
  it("rejects missing auth with 401", async () => {
    TG.__authUser = { data: { user: null } };
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array([0x89,0x50,0x4E,0x47])], { type: "image/png" }), "test.png");
    const r = await POST(req(fd, ""));
    expect(r.status).toBe(401);
  });

  it("rejects no file with 400", async () => {
    const fd = new FormData();
    const r = await POST(req(fd));
    expect(r.status).toBe(400);
  });

  it("accepts a valid PNG file", async () => {
    const fd = new FormData();
    // PNG magic bytes: 89 50 4E 47
    fd.append("file", new Blob([new Uint8Array([0x89,0x50,0x4E,0x47,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52])], { type: "image/png" }), "test.png");
    fd.append("folder", "avatars");
    const r = await POST(req(fd));
    expect(r.status).toBe(200);
  });

  it("rejects disallowed file type", async () => {
    const fd = new FormData();
    // PDF magic bytes: 25 50 44 46 (%PDF)
    fd.append("file", new Blob([new Uint8Array([0x25,0x50,0x44,0x46])], { type: "application/pdf" }), "test.pdf");
    const r = await POST(req(fd));
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBeDefined();
  });

  it("rejects video before it can be moderated or stored", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array([0x1A, 0x45, 0xDF, 0xA3])], { type: "video/webm" }), "clip.webm");
    fd.append("mediaKind", "video");
    const r = await POST(req(fd));
    expect(r.status).toBe(415);
    await expect(r.json()).resolves.toMatchObject({ code: "VIDEO_UPLOAD_UNAVAILABLE" });
  });
});
