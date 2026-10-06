// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useNotificationSync } from "./useNotificationSync";

afterEach(() => cleanup());

const AUTH = { id: "u1", profile: { id: "p1" } };
const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

function makeAuthFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("notification-count")) return json({ count: 4 });
    if (url.includes("profile-viewers")) return json({ viewers: [{ id: "v1", name: "Ada", avatar: "a.jpg", viewedAt: new Date().toISOString() }] });
    if (url.includes("notifications")) return json({ notifications: [] });
    return json({});
  });
}

describe("useNotificationSync", () => {
  it("polls the unread count and pulls profile viewers when authed", async () => {
    const authFetch = makeAuthFetch();
    const setProfileViewers = vi.fn();
    const setActivityFeed = vi.fn();
    const { result } = renderHook(() => useNotificationSync({ authFetch, authUser: AUTH, setProfileViewers, setActivityFeed }));
    await waitFor(() => expect(result.current.serverNotifCount).toBe(4));
    await waitFor(() => expect(setProfileViewers).toHaveBeenCalled());
    expect(setProfileViewers.mock.calls[0][0][0].name).toBe("Ada");
  });

  it("does nothing when signed out", () => {
    const authFetch = makeAuthFetch();
    renderHook(() => useNotificationSync({ authFetch, authUser: null, setProfileViewers: vi.fn(), setActivityFeed: vi.fn() }));
    expect(authFetch).not.toHaveBeenCalled();
  });
});
