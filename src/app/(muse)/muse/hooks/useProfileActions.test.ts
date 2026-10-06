// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useProfileActions } from "./useProfileActions";

afterEach(() => cleanup());

function args(over: Record<string, unknown> = {}) {
  return {
    obData: {},
    currentUser: {},
    setObData: vi.fn(),
    setCurrentUser: vi.fn(),
    setShowEditProfile: vi.fn(),
    authFetch: vi.fn(async () => new Response(JSON.stringify({ success: true, url: "u.jpg" }), { status: 200 })),
    trackQuest: vi.fn(),
    showToast: vi.fn(),
    ...over,
  };
}

describe("useProfileActions", () => {
  it("exposes edit-form defaults", () => {
    const { result } = renderHook(() => useProfileActions(args() as never));
    expect(result.current.editName).toBe("");
    expect(result.current.editNsfw).toBe(false);
    expect(result.current.editLooking).toEqual([]);
  });

  it("uploadImage posts to /api/muse/upload and returns the url", async () => {
    const authFetch = vi.fn(async () => new Response(JSON.stringify({ success: true, url: "u.jpg" }), { status: 200 }));
    const { result } = renderHook(() => useProfileActions(args({ authFetch }) as never));
    const url = await result.current.uploadImage(new File(["x"], "a.jpg"), "avatars");
    expect(url).toBe("u.jpg");
    expect(authFetch).toHaveBeenCalledWith("/api/muse/upload", expect.objectContaining({ method: "POST" }));
  });

  it("uploadImage returns null on failure", async () => {
    const authFetch = vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 }));
    const { result } = renderHook(() => useProfileActions(args({ authFetch }) as never));
    const url = await result.current.uploadImage(new File(["x"], "a.jpg"), "avatars");
    expect(url).toBeNull();
  });
});
