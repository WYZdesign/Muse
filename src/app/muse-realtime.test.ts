import { describe, it, expect, vi } from "vitest";

// muse-realtime.ts builds/imports the supabase client at module load; stub the
// heavy modules so the pure distance helper can be tested in isolation.
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {}, channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }), removeChannel: () => {} } }));
vi.mock("@/app/(muse)/muse/lib/auth-client", () => ({ authFetch: vi.fn() }));
vi.mock("@/lib/errorTracker", () => ({ trackError: vi.fn() }));

import { distanceMiles } from "./muse-realtime";

describe("distanceMiles (haversine)", () => {
  it("is zero for the same point", () => {
    expect(distanceMiles({ lat: 34.05, long: -118.24 }, { lat: 34.05, long: -118.24 })).toBe(0);
  });

  it("measures one degree of latitude as ~69 miles", () => {
    const d = distanceMiles({ lat: 0, long: 0 }, { lat: 1, long: 0 });
    expect(d).toBeGreaterThanOrEqual(68);
    expect(d).toBeLessThanOrEqual(70);
  });

  it("measures LA to NYC at roughly 2,450 miles", () => {
    const d = distanceMiles({ lat: 34.0522, long: -118.2437 }, { lat: 40.7128, long: -74.006 });
    expect(d).toBeGreaterThanOrEqual(2400);
    expect(d).toBeLessThanOrEqual(2500);
  });

  it("is symmetric", () => {
    const a = { lat: 51.5074, long: -0.1278 };
    const b = { lat: 48.8566, long: 2.3522 };
    expect(distanceMiles(a, b)).toBe(distanceMiles(b, a));
  });
});
