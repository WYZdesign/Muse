import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/aiDocs", () => ({
  askMuseAI: vi.fn(),
  retrieveContext: vi.fn(),
  museSystemPrompt: () => "test",
}));

// rate-limit fails CLOSED without Supabase. The support route's limit is 10/min;
// allow 10 calls then deny (429) so the behavior paths (200/400) AND the
// "rate limits after the threshold" test (429 on the 11th+ for a given IP) hold.
// Track per-IP so the distinct-IP tests in this file don't trip each other's caps.
const supportCallsByIp = new Map<string, number>();
vi.mock("@/lib/rate-limit", () => ({
  checkRate: vi.fn(async (ip: string) => {
    const n = (supportCallsByIp.get(ip) || 0) + 1;
    supportCallsByIp.set(ip, n);
    return n <= 10;
  }),
  checkRateUser: vi.fn(async () => true),
  clientIp: vi.fn((r: any) => r?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "10.0.0.1"),
}));

import { POST } from "@/app/api/muse/support/route";
import { askMuseAI, retrieveContext } from "@/lib/aiDocs";

let ipCounter = 0;
function mockReq(body: unknown) {
  const ip = `10.0.${Math.floor(ipCounter / 255)}.${ipCounter++ % 255}`;
  return {
    json: async () => body,
    headers: { get: (name: string) => (name === "x-forwarded-for" ? ip : null) },
  } as any;
}

describe("support route (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supportCallsByIp.clear();
  });

  it("returns 400 when question is missing", async () => {
    const r = await POST(mockReq({}));
    expect(r.status).toBe(400);
  });

  it("returns the AI answer when the AI is available", async () => {
    (askMuseAI as any).mockResolvedValue({ answer: "hi there", sources: ["Getting started"] });
    const r = await POST(mockReq({ question: "how do I sign up" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ai).toBe(true);
    expect(body.answer).toBe("hi there");
  });

  it("falls back to a static FAQ answer when AI is unavailable", async () => {
    (askMuseAI as any).mockResolvedValue(null);
    (retrieveContext as any).mockResolvedValue({ context: "", sources: [] });
    const r = await POST(mockReq({ question: "how do I book a session" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ai).toBe(false);
    expect(body.answer.length).toBeGreaterThan(0);
  });

  it("rate limits after the threshold", async () => {
    (askMuseAI as any).mockResolvedValue(null);
    (retrieveContext as any).mockResolvedValue({ context: "", sources: [] });
    const ip = "99.99.99.99";
    const mk = (body: unknown) => ({ json: async () => body, headers: { get: (n: string) => (n === "x-forwarded-for" ? ip : null) } } as any);
    let status = 200;
    for (let i = 0; i < 12; i++) {
      const r = await POST(mk({ question: "q" }));
      status = r.status;
    }
    expect(status).toBe(429);
  });
});
