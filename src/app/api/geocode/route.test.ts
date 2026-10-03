import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/demo-mode", () => ({ isDemoMode: vi.fn(() => false) }));

import { NextRequest } from "next/server";
import { GET } from "./route";
import { isDemoMode } from "@/lib/demo-mode";

const req = (qs: string) => GET(new NextRequest(`http://localhost/api/geocode${qs}`));

afterEach(() => vi.restoreAllMocks());

describe("GET /api/geocode", () => {
  it("returns a demo stub in demo mode (no network)", async () => {
    vi.mocked(isDemoMode).mockReturnValue(true);
    const spy = vi.spyOn(globalThis, "fetch");
    const res = await req("?lat=1&lon=2");
    expect((await res.json()).demo).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("400s when lat/lon are missing", async () => {
    vi.mocked(isDemoMode).mockReturnValue(false);
    expect((await req("")).status).toBe(400);
  });

  it("resolves city/state and flags ID-verification states", async () => {
    vi.mocked(isDemoMode).mockReturnValue(false);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ address: { city: "Austin", state: "Texas" } }), { status: 200 }),
    );
    const j = await (await req("?lat=30.27&lon=-97.74")).json();
    expect(j.city).toBe("Austin");
    expect(j.state).toBe("Texas");
    expect(j.requiresIdVerification).toBe(true);
  });

  it("does not flag non-verification states and falls back to town", async () => {
    vi.mocked(isDemoMode).mockReturnValue(false);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ address: { town: "Portland", state: "Oregon" } }), { status: 200 }),
    );
    const j = await (await req("?lat=45.5&lon=-122.6")).json();
    expect(j.city).toBe("Portland");
    expect(j.requiresIdVerification).toBe(false);
  });

  it("degrades gracefully (200, empty) when upstream fails", async () => {
    vi.mocked(isDemoMode).mockReturnValue(false);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const res = await req("?lat=1&lon=2");
    expect(res.status).toBe(200);
    expect((await res.json()).city).toBe("");
  });
});
