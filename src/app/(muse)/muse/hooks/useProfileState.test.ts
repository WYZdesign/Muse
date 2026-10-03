// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProfileState } from "./useProfileState";

describe("useProfileState", () => {
  it("has documented defaults", () => {
    const { result } = renderHook(() => useProfileState());
    expect(result.current.editName).toBe("");
    expect(result.current.userTier).toBe("free");
    expect(result.current.portfolioTab).toBe("all");
    expect(result.current.hydrated).toBe(false);
    expect(result.current.notifPrefs).toEqual({ match: true, message: true, brief: true, like: true });
    expect(result.current.editLooking).toEqual([]);
    expect(result.current.revealedNsfw.size).toBe(0);
  });

  it("exposes refs with sane initial values", () => {
    const { result } = renderHook(() => useProfileState());
    expect(result.current.photoInputRef.current).toBeNull();
    expect(result.current.lightboxPhotos.current).toEqual([]);
    expect(typeof result.current.shuffleSeedRef.current).toBe("number");
    expect(result.current.galleryView.current).toBeNull();
  });

  it("edits profile fields and notification prefs", () => {
    const { result } = renderHook(() => useProfileState());
    act(() => result.current.setEditName("Ada"));
    act(() => result.current.setNotifPrefs((p) => ({ ...p, like: false })));
    expect(result.current.editName).toBe("Ada");
    expect(result.current.notifPrefs.like).toBe(false);
  });

  it("resets the photo index when the viewed profile changes", () => {
    const { result } = renderHook(() => useProfileState());
    act(() => result.current.setViewProfile({ id: "a" }));
    act(() => result.current.setViewProfilePhotoIdx(4));
    expect(result.current.viewProfilePhotoIdx).toBe(4);
    act(() => result.current.setViewProfile({ id: "b" }));
    expect(result.current.viewProfilePhotoIdx).toBe(0);
  });
});
