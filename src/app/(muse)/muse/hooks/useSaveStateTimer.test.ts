// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveStateTimer } from "./useSaveStateTimer";

describe("useSaveStateTimer", () => {
  it("debounces the save by 4 seconds", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    renderHook(() => useSaveStateTimer({ saveState: save }));
    expect(save).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3999); });
    expect(save).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(save).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("restarts the timer when saveState identity changes", () => {
    vi.useFakeTimers();
    const a = vi.fn();
    const b = vi.fn();
    const { rerender } = renderHook(({ s }: { s: () => void }) => useSaveStateTimer({ saveState: s }), {
      initialProps: { s: a },
    });
    act(() => { vi.advanceTimersByTime(2000); });
    rerender({ s: b });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
