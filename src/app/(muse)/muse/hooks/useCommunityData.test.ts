// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCommunityData } from "./useCommunityData";

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

function makeAuthFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("type=events")) return json({ events: [{ id: 1, title: "E" }] });
    if (url.includes("type=rsvps")) return json({ rsvps: [1, 2] });
    if (url.includes("type=communities")) return json({ communities: [{ id: 1, name: "C" }] });
    return json({});
  });
}

describe("useCommunityData", () => {
  it("does not fetch without a profileId", () => {
    const f = makeAuthFetch();
    renderHook(() => useCommunityData({ authFetch: f, profileId: null }));
    expect(f).not.toHaveBeenCalled();
  });

  it("loads events, rsvps and communities", async () => {
    const f = makeAuthFetch();
    const { result } = renderHook(() => useCommunityData({ authFetch: f, profileId: "u1" }));
    await waitFor(() => expect(result.current.liveEvents).toHaveLength(1));
    expect(result.current.rsvpdEvents).toEqual([1, 2]);
    await waitFor(() => expect(result.current.liveCommunities).toHaveLength(1));
    expect(f).toHaveBeenCalledTimes(3);
  });
});
