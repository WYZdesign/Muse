import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ getServiceClient: () => ({ from: () => ({ insert: async () => ({}) }) }) }));
vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/demo-mode", () => ({ isDemoMode: () => true }));

import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const get = (qs: string) => GET(new NextRequest(`http://localhost/api/qr${qs}`));
const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/qr", { method: "POST", body: JSON.stringify(body) }));

describe("GET /api/qr — validation & SSRF", () => {
  it("400s when the url parameter is missing", async () => {
    expect((await get("")).status).toBe(400);
  });

  it("400s on a non-http(s) protocol", async () => {
    expect((await get("?url=ftp://example.com/x")).status).toBe(400);
  });

  it("400s on internal/loopback/link-local hosts (SSRF)", async () => {
    for (const h of ["http://127.0.0.1/x", "http://localhost/x", "http://10.0.0.5/x", "http://192.168.1.1/x", "http://169.254.1.1/x"]) {
      expect((await get(`?url=${encodeURIComponent(h)}`)).status, h).toBe(400);
    }
  });

  it("400s on an unparseable URL", async () => {
    expect((await get("?url=not a url")).status).toBe(400);
  });

  it("renders an SVG for a valid https url", async () => {
    const res = await get("?url=" + encodeURIComponent("https://muse.wyzdesign.com/muse"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(await res.text()).toContain("<svg");
  });

  it("allows otpauth:// (2FA) since it is only encoded, never fetched", async () => {
    const res = await get("?url=" + encodeURIComponent("otpauth://totp/Muses?secret=ABC"));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/qr", () => {
  it("400s when url is missing", async () => {
    expect((await post({})).status).toBe(400);
  });

  it("400s on an internal url", async () => {
    expect((await post({ url: "http://localhost/x" })).status).toBe(400);
  });

  it("renders an SVG for a valid url", async () => {
    const res = await post({ url: "https://example.com/x" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<svg");
  });
});
