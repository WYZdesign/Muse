// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfileData } from "./useProfileData";

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

function makeAuthFetch() {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (body.type === "get-checkins") return json({ checkins: [{ id: 1 }] });
    if (body.type === "get-safety-profile") return json({ safety: { city: "Austin" } });
    if (body.type === "get-prompts") return json({ prompts: [{ id: 1, q: "Best habit" }] });
    if (body.type === "get-prompt-responses") return json({ responses: [{ id: 1 }] });
    return json({});
  });
}

describe("useProfileData", () => {
  it("does not fetch without a profileId", () => {
    const authFetch = makeAuthFetch();
    const apiFetch = vi.fn();
    renderHook(() => useProfileData({ apiFetch, authFetch, profileId: null }));
    expect(authFetch).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("loads safety, prompts and stats for a signed-in profile", async () => {
    const authFetch = makeAuthFetch();
    const apiFetch = vi.fn(async () => json({ views: 5, likesReceived: 9 }));
    const { result } = renderHook(() => useProfileData({ apiFetch, authFetch, profileId: "u1" }));
    await waitFor(() => expect(result.current.safetyCheckins).toHaveLength(1));
    expect(result.current.safetyProfile.city).toBe("Austin");
    await waitFor(() => expect(result.current.promptBankData).toHaveLength(1));
    await waitFor(() => expect(result.current.myStats).toEqual({ views: 5, likes: 9 }));
  });
});
