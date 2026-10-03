// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBriefsState } from "./useBriefsState";

describe("useBriefsState", () => {
  it("has empty defaults with a concept brief category", () => {
    const { result } = renderHook(() => useBriefsState());
    expect(result.current.savedBriefs).toEqual([]);
    expect(result.current.appliedBriefs).toEqual([]);
    expect(result.current.showPostBrief).toBe(false);
    expect(result.current.briefTitle).toBe("");
    expect(result.current.briefCat).toBe("concept");
    expect(result.current.userBriefs).toEqual([]);
  });

  it("records saved/applied ids and a posted brief", () => {
    const { result } = renderHook(() => useBriefsState());
    act(() => result.current.setSavedBriefs((p) => [...p, 1]));
    act(() => result.current.setAppliedBriefs((p) => [...p, 2]));
    act(() =>
      result.current.setUserBriefs((p) => [...p, { id: 9, title: "T", desc: "D", budget: "$", tags: [], cat: "paid" }]),
    );
    expect(result.current.savedBriefs).toEqual([1]);
    expect(result.current.appliedBriefs).toEqual([2]);
    expect(result.current.userBriefs[0].title).toBe("T");
  });

  it("switches the composer category", () => {
    const { result } = renderHook(() => useBriefsState());
    act(() => result.current.setBriefCat("paid"));
    expect(result.current.briefCat).toBe("paid");
  });
});
