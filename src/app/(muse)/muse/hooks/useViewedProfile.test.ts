// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useViewedProfile } from "./useViewedProfile";

describe("useViewedProfile", () => {
  it("loads the viewed profile's reviews", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ reviews: [{ id: "r1" }, { id: "r2" }] }), { status: 200 }));
    const { result } = renderHook(() => useViewedProfile({ viewProfileId: "u1", fetchWithTimeout: fetch }));
    await waitFor(() => expect(result.current.viewProfileReviews).toHaveLength(2));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears reviews and resets the photo index when the profile closes", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ reviews: [{ id: "r1" }] }), { status: 200 }));
    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) => useViewedProfile({ viewProfileId: id, fetchWithTimeout: fetch }),
      { initialProps: { id: "u1" as string | undefined } },
    );
    await waitFor(() => expect(result.current.viewProfileReviews).toHaveLength(1));
    act(() => result.current.setViewProfilePhotoIdx(3));
    rerender({ id: undefined });
    await waitFor(() => expect(result.current.viewProfileReviews).toEqual([]));
    expect(result.current.viewProfilePhotoIdx).toBe(0);
  });

  it("does not fetch when there is no profile id", () => {
    const fetch = vi.fn();
    renderHook(() => useViewedProfile({ viewProfileId: null, fetchWithTimeout: fetch }));
    expect(fetch).not.toHaveBeenCalled();
  });
});
