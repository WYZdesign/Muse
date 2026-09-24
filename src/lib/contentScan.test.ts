import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
}));

(globalThis as any).__sbMock = {
  from: (tbl: string) => {
    const q: any = {
      select: () => q,
      insert: (v: any) => q,
      update: () => q,
      eq: () => q,
      limit: () => q,
      maybeSingle: async () => ({ data: null }),
    };
    q.then = (resolve: any) => resolve({ data: null, error: null });
    return q;
  },
  auth: {},
};

import {
  scanWithRekognition,
  scanWithSightengine,
  logScan,
  reportIncident,
  escalateToNcmec,
  startVideoModeration,
  getVideoModerationResult,
  ncmecConfigured,
  submitToCyberTipline,
  transmitPendingNcmecReports,
} from "@/lib/contentScan";

const cleanResult = {
  safe: true,
  scanned: false,
  flaggedCategories: [] as string[],
  confidence: 0,
  shouldBlock: false,
  shouldReport: false,
  isCSAM: false,
  details: [] as any[],
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
  delete process.env.SIGHTENGINE_API_USER;
  delete process.env.SIGHTENGINE_API_SECRET;
  (globalThis as any).__sbMock = {
    from: (tbl: string) => {
      const q: any = {
        select: () => q,
        insert: (v: any) => {
          ((globalThis as any).__inserts ||= []).push({ table: tbl, value: v });
          return q;
        },
        update: () => q,
        eq: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: null }),
      };
      q.then = (resolve: any) => resolve({ data: null, error: null });
      return q;
    },
    auth: {},
  };
  (globalThis as any).__inserts = [];
});

describe("contentScan — Rekognition", () => {
  it("scanWithRekognition fails closed when no AWS creds", async () => {
    const result = await scanWithRekognition(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
    expect(result.safe).toBe(false);
    expect(result.scanned).toBe(false);
    expect(result.flaggedCategories).toEqual(["SCAN_UNAVAILABLE"]);
    expect(result.shouldBlock).toBe(true);
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
});

describe("contentScan — Sightengine", () => {
  it("scanWithSightengine is fail-open (safe/unscanned) without credentials", async () => {
    const result = await scanWithSightengine(Buffer.from([0xFF, 0xD8]));
    expect(result.safe).toBe(true);
    expect(result.scanned).toBe(false);
    expect(result.shouldBlock).toBe(false);
    expect(result.flaggedCategories).toEqual([]);
  });

  it("scanWithSightengine stays fail-open when fetch throws", async () => {
    process.env.SIGHTENGINE_API_USER = "user";
    process.env.SIGHTENGINE_API_SECRET = "secret";
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));
    const result = await scanWithSightengine(Buffer.from([0xFF, 0xD8]));
    spy.mockRestore();
    expect(result.safe).toBe(true);
    expect(result.scanned).toBe(false);
    expect(result.shouldBlock).toBe(false);
  });
});

describe("contentScan — video helpers (unavailable scanner)", () => {
  it("startVideoModeration errors without Rekognition", async () => {
    const r = await startVideoModeration(Buffer.alloc(10));
    expect(r).toEqual({ error: "Rekognition unavailable" });
  });

  it("getVideoModerationResult errors without Rekognition", async () => {
    const r = await getVideoModerationResult("job-1");
    expect(r).toEqual({ error: "Rekognition unavailable", done: false });
  });
});

describe("contentScan — persistence + escalation", () => {
  it("logScan does not throw on Supabase errors", async () => {
    (globalThis as any).__sbMock = {
      from: () => {
        const q: any = { select: () => q, insert: () => q, update: () => q, eq: () => q };
        q.then = (resolve: any) => resolve({ error: new Error("DB down") });
        return q;
      },
    };
    await logScan({
      userId: "u1",
      fileName: "test.jpg",
      fileType: "image/jpeg",
      fileSize: 1000,
      context: "upload",
      result: cleanResult,
    });
  });

  it("logScan inserts scan record successfully", async () => {
    await logScan({
      userId: "u1",
      fileName: "test.jpg",
      fileType: "image/jpeg",
      fileSize: 1000,
      context: "upload",
      result: cleanResult,
    });
    expect((globalThis as any).__inserts.length).toBe(1);
    expect((globalThis as any).__inserts[0].table).toBe("muse_content_scans");
  });

  it("reportIncident inserts a content_policy_violation when not CSAM", async () => {
    await reportIncident({
      userId: "u1",
      context: "upload",
      result: { ...cleanResult, shouldReport: true, flaggedCategories: ["Violence"] },
    });
    const row = (globalThis as any).__inserts.find((i: any) => i.table === "muse_safety_incidents");
    expect(row).toBeTruthy();
    expect(row.value.type).toBe("content_policy_violation");
    expect(row.value.status).toBe("pending_review");
  });

  it("reportIncident marks CSAM incidents critical + pending_ncmec", async () => {
    await reportIncident({
      userId: "u1",
      context: "upload",
      result: { ...cleanResult, isCSAM: true, shouldReport: true },
    });
    const row = (globalThis as any).__inserts.find((i: any) => i.table === "muse_safety_incidents");
    expect(row.value.type).toBe("csam");
    expect(row.value.severity).toBe("critical");
    expect(row.value.status).toBe("pending_ncmec");
  });

  it("escalateToNcmec suspends profile and stages pending_submission report", async () => {
    const updates: any[] = [];
    const from = (globalThis as any).__sbMock.from.bind((globalThis as any).__sbMock);
    (globalThis as any).__sbMock.from = (tbl: string) => {
      const q: any = {
        select: () => q,
        insert: (v: any) => {
          ((globalThis as any).__inserts ||= []).push({ table: tbl, value: v });
          return q;
        },
        update: (v: any) => {
          updates.push({ table: tbl, value: v });
          return { eq: async () => ({ error: null }) };
        },
        eq: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: null }),
      };
      q.then = (resolve: any) => resolve({ data: null, error: null });
      return q;
    };
    await escalateToNcmec({
      userId: "u1",
      context: "upload",
      fileName: "bad.jpg",
      result: { ...cleanResult, isCSAM: true, shouldBlock: true, shouldReport: true, flaggedCategories: ["Child Sexual Abuse"] },
    });
    expect(updates.some((u) => u.table === "muse_profiles" && u.value.suspended === true)).toBe(true);
    const report = (globalThis as any).__inserts.find((i: any) => i.table === "muse_ncmec_reports");
    expect(report).toBeTruthy();
    expect(report.value.status).toBe("pending_submission");
    expect(report.value.report_type).toBe("child_sexual_abuse_material");
    (globalThis as any).__sbMock.from = from;
  });
});

describe("contentScan — NCMEC config gates", () => {
  it("ncmecConfigured is false when endpoint/creds missing at module load", () => {
    // Module-level env capture: this suite loads without NCMEC_* set.
    expect(ncmecConfigured()).toBe(false);
  });

  it("submitToCyberTipline refuses without config", async () => {
    const r = await submitToCyberTipline({
      report_id: "r1",
      user_id: "u1",
      file_name: "f.jpg",
      context: "",
      flagged_categories: [],
      confidence: 90,
      reported_at: new Date().toISOString(),
    });
    expect(r.submitted).toBe(false);
    expect(r.error).toMatch(/not configured/i);
  });

  it("transmitPendingNcmecReports no-ops without config", async () => {
    const r = await transmitPendingNcmecReports();
    expect(r).toEqual({ submitted: 0, failed: 0 });
  });
});
