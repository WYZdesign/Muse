// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useBootstrapData } from "./useBootstrapData";

afterEach(() => cleanup());

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

function makeParams(over: Record<string, unknown> = {}) {
  return {
    apiFetch: vi.fn(async (url: string) => {
      if (url.includes("type=professionals")) return json({ professionals: [] });
      return json({});
    }),
    authUserProfileId: "u1",
    liveBriefsLen: 0, feedPostsLen: 0, forumPostsLen: 0, liveForumLen: 0,
    liveEventsLen: 0, liveCommunitiesLen: 0, liveSessionsLen: 0,
    setLiveProfiles: vi.fn(), setLiveBriefs: vi.fn(), setLiveFeed: vi.fn(), setFeedPosts: vi.fn(),
    setLiveForum: vi.fn(), setForumPosts: vi.fn(), setLiveEvents: vi.fn(), setLiveCommunities: vi.fn(),
    setLiveSessions: vi.fn(), setLiveProfessionals: vi.fn(), setBootstrapped: vi.fn(), setDiscoverLoading: vi.fn(),
    ...over,
  };
}

describe("useBootstrapData", () => {
  it("returns a bootstrapData callback", () => {
    const { result } = renderHook(() => useBootstrapData(makeParams() as never));
    expect(typeof result.current.bootstrapData).toBe("function");
  });

  it("fetches and writes state, then flips bootstrapped/loading", async () => {
    const params = makeParams({
      apiFetch: vi.fn(async (url: string) => {
        if (url.includes("type=professionals")) return json({ professionals: [{ id: "p1" }] });
        if (url.includes("type=briefs")) return json({ briefs: [{ id: 1, title: "T" }] });
        return json({});
      }),
    });
    const { result } = renderHook(() => useBootstrapData(params as never));
    await act(async () => { await result.current.bootstrapData(); });
    expect(params.setLiveBriefs).toHaveBeenCalled();
    expect(params.setBootstrapped).toHaveBeenCalledWith(true);
    expect(params.setDiscoverLoading).toHaveBeenCalledWith(false);
  });
});
