// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSessionData } from "./useSessionData";

describe("useSessionData", () => {
  it("does not fetch without a profileId", () => {
    const authFetch = vi.fn();
    renderHook(() => useSessionData({ authFetch, profileId: null }));
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("seeds published demo bookings and reminders for a signed-in profile", () => {
    const authFetch = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const { result } = renderHook(() => useSessionData({ authFetch, profileId: "u1" }));
    expect(result.current.myBookings.asBooker).toHaveLength(3);
    expect(result.current.myBookings.asHost).toHaveLength(2);
    expect(result.current.bookingReminders.length).toBeGreaterThan(0);
    expect(result.current.liveSessions).toBeNull();
  });
});
