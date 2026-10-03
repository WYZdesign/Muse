// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePreferenceSync } from "./usePreferenceSync";

const AUTH_USER = { id: "u1" };
const NOTIF = { match: true };
const STYLES: string[] = ["portrait"];

describe("usePreferenceSync", () => {
  it("does not save when signed out", () => {
    vi.useFakeTimers();
    const apiFetch = vi.fn();
    renderHook(() =>
      usePreferenceSync({ apiFetch, authUser: null, obStep: 1, notifPrefs: NOTIF, filterStyles: STYLES, filterScore: 50, appliedBriefs: [], showNsfw: false }),
    );
    act(() => { vi.advanceTimersByTime(3000); });
    expect(apiFetch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("debounces a save-preferences call when signed in", () => {
    vi.useFakeTimers();
    const apiFetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
    renderHook(() =>
      usePreferenceSync({ apiFetch, authUser: AUTH_USER, obStep: 1, notifPrefs: NOTIF, filterStyles: STYLES, filterScore: 70, appliedBriefs: [1], showNsfw: false }),
    );
    act(() => { vi.advanceTimersByTime(1999); });
    expect(apiFetch).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(apiFetch.mock.calls[0][1]?.body));
    expect(body.action).toBe("save-preferences");
    expect(body.preferences.filterScore).toBe(70);
    vi.useRealTimers();
  });
});
