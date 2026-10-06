// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/safe-observer", () => ({
  createSafeObserver: vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn(() => []) })),
}));

import { renderHook, cleanup } from "@testing-library/react";
import { useVisualEffects } from "./useVisualEffects";

describe("useVisualEffects", () => {
  it("mounts without throwing and installs the global image-error listener", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    renderHook(() => useVisualEffects({ screen: "discover" }));
    expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function), true);
    addSpy.mockRestore();
    cleanup();
  });

  it("re-renders across screens without throwing", () => {
    const { rerender } = renderHook(({ screen }: { screen: string }) => useVisualEffects({ screen }), {
      initialProps: { screen: "discover" },
    });
    expect(() => rerender({ screen: "feed" })).not.toThrow();
    expect(() => rerender({ screen: "settings" })).not.toThrow();
    cleanup();
  });
});
