// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettingsState } from "./useSettingsState";

describe("useSettingsState", () => {
  it("has documented defaults", () => {
    const { result } = renderHook(() => useSettingsState());
    expect(result.current.connTab).toBe("community");
    expect(result.current.sessTab).toBe("sessions");
    expect(result.current.forumSort).toBe("hot");
    expect(result.current.theme).toBe("lasunset");
    expect(result.current.matchesView).toBe("list");
    expect(result.current.serverNotifCount).toBe(0);
    expect(result.current.savedSearches).toEqual([]);
    expect(result.current.discoveryPrefs).toEqual({ ageMin: 18, ageMax: 50, distance: 50, gender: "all" });
    expect(result.current.myGeo).toBeNull();
  });

  it("changes tab, theme and discovery preferences", () => {
    const { result } = renderHook(() => useSettingsState());
    act(() => result.current.setConnTab("events"));
    act(() => result.current.setTheme("nebula"));
    act(() => result.current.setDiscoveryPrefs((p) => ({ ...p, distance: 25 })));
    act(() => result.current.setServerNotifCount(4));
    expect(result.current.connTab).toBe("events");
    expect(result.current.theme).toBe("nebula");
    expect(result.current.discoveryPrefs.distance).toBe(25);
    expect(result.current.serverNotifCount).toBe(4);
  });
});
