// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSavedListingsState } from "./useSavedListingsState";

describe("useSavedListingsState", () => {
  it("starts with empty save lists", () => {
    const { result } = renderHook(() => useSavedListingsState());
    expect(result.current.savedSessionIds).toEqual([]);
    expect(result.current.savedProfileIds).toEqual([]);
  });

  it("records session and profile saves (string or number ids)", () => {
    const { result } = renderHook(() => useSavedListingsState());
    act(() => result.current.setSavedSessionIds((p) => [...p, "s1", 2]));
    act(() => result.current.setSavedProfileIds((p) => [...p, "p1"]));
    expect(result.current.savedSessionIds).toEqual(["s1", 2]);
    expect(result.current.savedProfileIds).toEqual(["p1"]);
  });
});
