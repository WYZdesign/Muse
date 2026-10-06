// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useSessionApply } from "./useSessionApply";

afterEach(() => cleanup());

describe("useSessionApply", () => {
  it("exposes an applySession callback", () => {
    const { result } = renderHook(() => useSessionApply({} as never));
    expect(typeof result.current).toBe("function");
  });
});
