import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
}));

(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      insert: (v: any) => q,
      eq: () => q,
      maybeSingle: async () => ({ data: null }),
    };
    q.then = (resolve: any) => resolve({ data: null, error: null });
    return q;
  },
};

import { scanWithRekognition, logScan } from "@/lib/contentScan";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
});

describe("contentScan", () => {
  it("scanWithRekognition fails open when no AWS creds (dev/test)", async () => {
    // Without AWS creds, getRekognition() returns undefined → fail-open
    const result = await scanWithRekognition(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
    expect(result.safe).toBe(true);
    expect(result.scanned).toBe(false);
    expect(result.flaggedCategories).toEqual([]);
    expect(result.shouldBlock).toBe(false);
    expect(result.isCSAM).toBe(false);
  });

  it("scanWithRekognition returns valid ModerationResult shape", async () => {
    const result = await scanWithRekognition(Buffer.alloc(100));
    expect(result).toHaveProperty("safe");
    expect(result).toHaveProperty("scanned");
    expect(result).toHaveProperty("flaggedCategories");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("shouldBlock");
    expect(result).toHaveProperty("shouldReport");
    expect(result).toHaveProperty("isCSAM");
    expect(result).toHaveProperty("details");
  });

  it("logScan does not throw on Supabase errors", async () => {
    (globalThis as any).__sbMock = {
      from: () => {
        const q: any = { select: () => q, insert: () => q, eq: () => q };
        q.then = (resolve: any) => resolve({ error: new Error("DB down") });
        return q;
      },
    };
    await logScan({ userId: "u1", fileName: "test.jpg", fileType: "image/jpeg", fileSize: 1000, context: "upload", result: { safe: true, scanned: false, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, isCSAM: false, details: [] } });
  });

  it("logScan inserts scan record successfully", async () => {
    const inserts: any[] = [];
    (globalThis as any).__sbMock = {
      from: () => {
        const q: any = { select: () => q, insert: (v: any) => { inserts.push(v); return q; }, eq: () => q };
        q.then = (resolve: any) => resolve({ error: null });
        return q;
      },
    };
    await logScan({ userId: "u1", fileName: "test.jpg", fileType: "image/jpeg", fileSize: 1000, context: "upload", result: { safe: true, scanned: false, flaggedCategories: [], confidence: 0, shouldBlock: false, shouldReport: false, isCSAM: false, details: [] } });
    expect(inserts.length).toBe(1);
  });
});
