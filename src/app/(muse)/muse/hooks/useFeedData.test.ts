// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFeedData } from "./useFeedData";

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

function makeAuthFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("type=feed")) return json({ posts: [{ id: "p1", text: "hi", author_id: { name: "Ada" } }] });
    if (url.includes("type=moments")) return json({ moments: [{ id: 1, text: "m", author_id: { name: "Bo" } }] });
    if (url.includes("type=forum")) return json({ posts: [{ id: 1, title: "T", author_id: { name: "Cy" } }] });
    return json({});
  });
}

describe("useFeedData", () => {
  it("does not fetch without a profileId", () => {
    const f = makeAuthFetch();
    renderHook(() => useFeedData({ authFetch: f, profileId: null, initialStories: [] }));
    expect(f).not.toHaveBeenCalled();
  });

  it("loads feed, moments and forum for an authenticated profile", async () => {
    const f = makeAuthFetch();
    const { result } = renderHook(() => useFeedData({ authFetch: f, profileId: "u1", initialStories: [] }));
    await waitFor(() => expect(result.current.liveFeed).toHaveLength(1));
    expect(result.current.liveFeed![0].author).toBe("Ada");
    expect(result.current.stories).toHaveLength(1);
    await waitFor(() => expect(result.current.liveForum).toHaveLength(1));
    expect(f).toHaveBeenCalledTimes(3);
  });
});
