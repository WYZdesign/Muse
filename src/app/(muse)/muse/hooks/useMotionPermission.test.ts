// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";

vi.mock("./useDeviceTilt", () => ({ requestMotionPermission: vi.fn() }));

import { renderHook, act } from "@testing-library/react";
import { useMotionPermission } from "./useMotionPermission";
import { requestMotionPermission } from "./useDeviceTilt";

describe("useMotionPermission", () => {
  it("requests motion permission once on the first touch", () => {
    renderHook(() => useMotionPermission());
    act(() => { document.dispatchEvent(new Event("pointerdown")); });
    expect(requestMotionPermission).toHaveBeenCalledTimes(1);
    act(() => { document.dispatchEvent(new Event("pointerdown")); });
    expect(requestMotionPermission).toHaveBeenCalledTimes(1);
  });
});
