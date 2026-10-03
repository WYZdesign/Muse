// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToastChannel } from "./useToastChannel";

describe("useToastChannel", () => {
  it("surfaces the storage-quota message", () => {
    const showToast = vi.fn();
    renderHook(() => useToastChannel({ showToast }));
    act(() => { window.dispatchEvent(new Event("muse:storage-quota")); });
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Storage full"));
  });

  it("forwards muse:toast custom events", () => {
    const showToast = vi.fn();
    renderHook(() => useToastChannel({ showToast }));
    act(() => { window.dispatchEvent(new CustomEvent("muse:toast", { detail: "Saved" })); });
    expect(showToast).toHaveBeenCalledWith("Saved");
  });

  it("ignores empty toast events", () => {
    const showToast = vi.fn();
    renderHook(() => useToastChannel({ showToast }));
    act(() => { window.dispatchEvent(new CustomEvent("muse:toast", { detail: "" })); });
    expect(showToast).not.toHaveBeenCalled();
  });
});
