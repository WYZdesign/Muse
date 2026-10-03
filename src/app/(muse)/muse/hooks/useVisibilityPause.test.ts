// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVisibilityPause } from "./useVisibilityPause";

afterEach(() => {
  document.body.classList.remove("animations-paused");
});

describe("useVisibilityPause", () => {
  it("pauses animations when the tab is hidden and resumes when visible", () => {
    renderHook(() => useVisibilityPause());
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(document.body.classList.contains("animations-paused")).toBe(true);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(document.body.classList.contains("animations-paused")).toBe(false);
  });

  it("removes its listener on unmount", () => {
    const spy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useVisibilityPause());
    unmount();
    expect(spy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    spy.mockRestore();
  });
});
