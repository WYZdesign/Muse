// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardNav } from "./useKeyboardNav";

describe("useKeyboardNav", () => {
  it("does nothing off the discover screen", () => {
    const doSwipe = vi.fn();
    renderHook(() => useKeyboardNav({ screen: "feed", doSwipe }));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" })); });
    expect(doSwipe).not.toHaveBeenCalled();
  });

  it("swipes on arrow keys on the discover screen", () => {
    const doSwipe = vi.fn();
    renderHook(() => useKeyboardNav({ screen: "discover", doSwipe }));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })); });
    expect(doSwipe).toHaveBeenCalledWith("right");
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" })); });
    expect(doSwipe).toHaveBeenCalledWith("left");
  });

  it("ignores unrelated keys", () => {
    const doSwipe = vi.fn();
    renderHook(() => useKeyboardNav({ screen: "discover", doSwipe }));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })); });
    expect(doSwipe).not.toHaveBeenCalled();
  });
});
