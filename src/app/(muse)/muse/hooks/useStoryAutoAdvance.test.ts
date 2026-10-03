// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStoryAutoAdvance } from "./useStoryAutoAdvance";

describe("useStoryAutoAdvance", () => {
  it("advances to the next story after 5 seconds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStoryAutoAdvance({ stories: [1, 2, 3] }));
    act(() => result.current.setShowStory(0));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.showStory).toBe(1);
    vi.useRealTimers();
  });

  it("closes at the end of the story list", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStoryAutoAdvance({ stories: [1, 2] }));
    act(() => result.current.setShowStory(1));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.showStory).toBeNull();
    vi.useRealTimers();
  });

  it("does nothing when no story is open", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStoryAutoAdvance({ stories: [1] }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current.showStory).toBeNull();
    vi.useRealTimers();
  });
});
