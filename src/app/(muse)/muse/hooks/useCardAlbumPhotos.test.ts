// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCardAlbumPhotos } from "./useCardAlbumPhotos";

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });
const PROFILES = [{ id: "p1" }];
// Stable identities — these are effect dependencies; a fresh array each render
// would re-fire the effect forever.
const EMPTY_PROFILES: { id?: string | number }[] = [];

describe("useCardAlbumPhotos", () => {
  it("does not fetch when the current card has no id", () => {
    const apiFetch = vi.fn();
    const { result } = renderHook(() => useCardAlbumPhotos({ apiFetch, filteredProfiles: EMPTY_PROFILES, currentIdx: 0 }));
    expect(result.current.cardAlbums).toEqual([]);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("loads albums for the current card", async () => {
    const apiFetch = vi.fn(async () =>
      json({ albums: [{ id: "a1", title: "T", cover_url: "c.jpg", access_level: "public", photo_count: 3 }] }),
    );
    const { result } = renderHook(() => useCardAlbumPhotos({ apiFetch, filteredProfiles: PROFILES, currentIdx: 0 }));
    await waitFor(() => expect(result.current.cardAlbums).toHaveLength(1));
    expect(result.current.cardAlbums[0].title).toBe("T");
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining("type=albums&profile_id=p1"));
  });
});
