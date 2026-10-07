// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDiscoveryData } from "./useDiscoveryData";

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

function makeAuthFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("type=discover-ranked")) return json({ profiles: [{ id: "p1", name: "Ada", matchScore: 88 }] });
    if (url.includes("type=matches")) return json({ matches: [{ target_id: { id: "t1", name: "Bo" } }] });
    return json({});
  });
}

describe("useDiscoveryData", () => {
  it("does not fetch without a profileId", () => {
    const authFetch = makeAuthFetch();
    const apiFetch = vi.fn();
    renderHook(() => useDiscoveryData({ authFetch, apiFetch, profileId: null }));
    expect(authFetch).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("loads ranked profiles, matches and blocks", async () => {
    const authFetch = makeAuthFetch();
    const apiFetch = vi.fn(async () => json({ blocked: ["b1"] }));
    const { result } = renderHook(() => useDiscoveryData({ authFetch, apiFetch, profileId: "u1" }));
    await waitFor(() => expect(result.current.liveProfiles).toHaveLength(1));
    expect(result.current.liveProfiles![0].matchScore).toBe(88);
    await waitFor(() => expect(result.current.matches).toHaveLength(1));
    expect(result.current.matches[0].name).toBe("Bo");
    await waitFor(() => expect(result.current.blockedUsers).toContain("b1"));
  });

  // The backend now passes through verified/last_seen_at/showOnline for
  // discover-ranked (they were previously never selected, so the card's
  // verified checkmark and online dot could never show for a real profile).
  // This locks in that the hook derives `online` from last_seen_at the same
  // way the matches list already does (5-minute threshold).
  it("derives online from a recent last_seen_at, and passes through verified/showOnline", async () => {
    const recentSeen = new Date(Date.now() - 60000).toISOString();
    const staleSeen = new Date(Date.now() - 20 * 60000).toISOString();
    const authFetch = vi.fn(async (url: string) => {
      if (url.includes("type=discover-ranked")) return json({ profiles: [
        { id: "p1", name: "Ada", matchScore: 88, verified: true, last_seen_at: recentSeen, showOnline: true },
        { id: "p2", name: "Bo", matchScore: 50, verified: false, last_seen_at: staleSeen, showOnline: true },
      ] });
      if (url.includes("type=matches")) return json({ matches: [] });
      return json({});
    });
    const apiFetch = vi.fn(async () => json({}));
    const { result } = renderHook(() => useDiscoveryData({ authFetch, apiFetch, profileId: "u1" }));
    await waitFor(() => expect(result.current.liveProfiles).toHaveLength(2));
    const [recent, stale] = result.current.liveProfiles!;
    expect(recent.verified).toBe(true);
    expect(recent.online).toBe(true);
    expect(stale.online).toBe(false);
  });
});
