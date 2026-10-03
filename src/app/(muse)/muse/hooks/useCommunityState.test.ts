// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommunityState } from "./useCommunityState";

describe("useCommunityState", () => {
  it("has documented defaults", () => {
    const { result } = renderHook(() => useCommunityState());
    expect(result.current.commTab).toBe("groups");
    expect(result.current.forumSort).toBe("hot");
    expect(result.current.forumHasMore).toBe(true);
    expect(result.current.groupForm).toEqual({ name: "", description: "", category: "", isNsfw: false });
    expect(result.current.eventForm).toEqual({ title: "", description: "", date: "", location: "" });
    expect(result.current.groups).toEqual([]);
    expect(result.current.forumPosts).toEqual([]);
  });

  it("edits and resets the group form", () => {
    const { result } = renderHook(() => useCommunityState());
    act(() => result.current.setGroupFormField("name", "LA Shooters"));
    act(() => result.current.setGroupFormField("isNsfw", true));
    expect(result.current.groupForm.name).toBe("LA Shooters");
    expect(result.current.groupForm.isNsfw).toBe(true);
    act(() => result.current.resetGroupForm());
    expect(result.current.groupForm).toEqual({ name: "", description: "", category: "", isNsfw: false });
  });

  it("edits and resets the event form, and switches tabs", () => {
    const { result } = renderHook(() => useCommunityState());
    act(() => result.current.setEventFormField("title", "Gallery Night"));
    act(() => result.current.setCommTab("events"));
    expect(result.current.eventForm.title).toBe("Gallery Night");
    expect(result.current.commTab).toBe("events");
    act(() => result.current.resetEventForm());
    expect(result.current.eventForm).toEqual({ title: "", description: "", date: "", location: "" });
  });
});
