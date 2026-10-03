// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVisitedScreens } from "./useVisitedScreens";

describe("useVisitedScreens", () => {
  it("seeds with the initial screen", () => {
    const { result } = renderHook(({ s }: { s: "discover" | "chat" }) => useVisitedScreens(s), {
      initialProps: { s: "discover" },
    });
    expect(result.current.has("discover")).toBe(true);
    expect(result.current.size).toBe(1);
  });

  it("grows (never shrinks) as more screens are visited", () => {
    const { result, rerender } = renderHook(({ s }: { s: "discover" | "chat" | "feed" }) => useVisitedScreens(s), {
      initialProps: { s: "discover" },
    });
    rerender({ s: "chat" });
    rerender({ s: "feed" });
    expect([...result.current].sort()).toEqual(["chat", "discover", "feed"]);
    expect(result.current.size).toBe(3);
  });

  it("is idempotent for the same screen (StrictMode double-render safe)", () => {
    const { result, rerender } = renderHook(({ s }: { s: "discover" }) => useVisitedScreens(s), {
      initialProps: { s: "discover" },
    });
    rerender({ s: "discover" });
    expect(result.current.size).toBe(1);
  });
});
