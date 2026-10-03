// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMessageRequests } from "./useMessageRequests";

// Stable identities — authUser is an effect dependency, so a fresh object each
// render would re-fire the effect forever.
const AUTH_USER = { id: "u1" };

describe("useMessageRequests", () => {
  it("does nothing off the matches screen (no fetch, no seed)", () => {
    const apiFetch = vi.fn();
    const { result } = renderHook(() => useMessageRequests({ screen: "discover", authUser: AUTH_USER, apiFetch }));
    expect(result.current.messageRequests).toEqual([]);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("does nothing when signed out", () => {
    const apiFetch = vi.fn();
    const { result } = renderHook(() => useMessageRequests({ screen: "matches", authUser: null, apiFetch }));
    expect(result.current.messageRequests).toEqual([]);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("seeds demo requests on the matches screen when signed in", () => {
    const apiFetch = vi.fn();
    const { result } = renderHook(() => useMessageRequests({ screen: "matches", authUser: AUTH_USER, apiFetch }));
    expect(result.current.messageRequests).toHaveLength(3);
  });
});
