// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useThemeEffect } from "./useThemeEffect";

describe("useThemeEffect", () => {
  it("applies the theme to the document root", () => {
    renderHook(({ theme }: { theme: string }) => useThemeEffect({ theme }), { initialProps: { theme: "nebula" } });
    expect(document.documentElement.getAttribute("data-theme")).toBe("nebula");
  });

  it("re-applies when the theme changes", () => {
    const { rerender } = renderHook(({ theme }: { theme: string }) => useThemeEffect({ theme }), {
      initialProps: { theme: "lasunset" },
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("lasunset");
    rerender({ theme: "frost" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("frost");
  });
});
