// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFeedState } from "./useFeedState";
import type { FeedPost } from "../components/types";

const post = (id: number | string) => ({ id, author: "A", avatar: "", type: "text", text: "", likes: 0, comments: 0, shares: 0, time: "", img: "" }) as unknown as FeedPost;

describe("useFeedState", () => {
  it("has sensible defaults", () => {
    const { result } = renderHook(() => useFeedState());
    expect(result.current.feedText).toBe("");
    expect(result.current.feedMedia).toEqual([]);
    expect(result.current.feedPosts).toEqual([]);
    expect(result.current.feedFilter).toBe("all");
    expect(result.current.feedPage).toBe(1);
    expect(result.current.feedHasMore).toBe(true);
    expect(result.current.feedError).toBeNull();
    expect(result.current.optimisticPosts).toEqual([]);
  });

  it("prepends optimistic posts and removes by id", () => {
    const { result } = renderHook(() => useFeedState());
    act(() => result.current.addOptimisticPost(post("p1")));
    act(() => result.current.addOptimisticPost(post("p2")));
    expect(result.current.optimisticPosts.map((p) => p.id)).toEqual(["p2", "p1"]);
    act(() => result.current.removeOptimisticPost("p2"));
    expect(result.current.optimisticPosts.map((p) => p.id)).toEqual(["p1"]);
  });

  it("clears all optimistic posts", () => {
    const { result } = renderHook(() => useFeedState());
    act(() => result.current.addOptimisticPost(post(1)));
    act(() => result.current.clearOptimisticPosts());
    expect(result.current.optimisticPosts).toEqual([]);
  });

  it("switches the feed filter", () => {
    const { result } = renderHook(() => useFeedState());
    act(() => result.current.setFeedFilter("photos"));
    expect(result.current.feedFilter).toBe("photos");
  });
});
