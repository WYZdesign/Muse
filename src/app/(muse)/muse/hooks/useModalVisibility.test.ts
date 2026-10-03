// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModalVisibility } from "./useModalVisibility";

describe("useModalVisibility", () => {
  it("starts every modal flag closed", () => {
    const { result } = renderHook(() => useModalVisibility());
    const flags = Object.entries(result.current).filter(([k]) => k.startsWith("show") && !k.startsWith("setShow"));
    expect(flags.length).toBe(28);
    for (const [k, v] of flags) expect(v, k).toBe(false);
  });

  it("opens and closes a flag independently", () => {
    const { result } = renderHook(() => useModalVisibility());
    act(() => result.current.setShowFilterModal(true));
    expect(result.current.showFilterModal).toBe(true);
    expect(result.current.showEditProfile).toBe(false);
    act(() => result.current.setShowFilterModal(false));
    expect(result.current.showFilterModal).toBe(false);
  });

  it("allows several modals open at once (independent flags)", () => {
    const { result } = renderHook(() => useModalVisibility());
    act(() => {
      result.current.setShowNewPost(true);
      result.current.setShowEmojiPicker(true);
    });
    expect(result.current.showNewPost).toBe(true);
    expect(result.current.showEmojiPicker).toBe(true);
  });
});
