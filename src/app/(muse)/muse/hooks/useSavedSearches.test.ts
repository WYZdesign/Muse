// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSavedSearches } from "./useSavedSearches";

describe("useSavedSearches", () => {
  it("does not fetch while the preferences modal is closed", () => {
    const apiFetch = vi.fn();
    renderHook(() => useSavedSearches({ showDiscoveryPrefs: false, apiFetch }));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("hydrates saved searches when the modal opens", async () => {
    const apiFetch = vi.fn(async () => new Response(JSON.stringify({ searches: [{ id: "s1", name: "LA Portrait" }] }), { status: 200 }));
    const { result } = renderHook(() => useSavedSearches({ showDiscoveryPrefs: true, apiFetch }));
    await waitFor(() => expect(result.current.savedSearches).toHaveLength(1));
    expect(result.current.savedSearches[0].name).toBe("LA Portrait");
  });
});
