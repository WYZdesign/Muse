// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useSessionRefresh } from "./useSessionRefresh";

afterEach(() => cleanup());

const AUTH = { id: "u1" };
const applySession = vi.fn();
const setRefreshToken = vi.fn();
const doLogout = vi.fn();

beforeEach(() => {
  applySession.mockClear();
  setRefreshToken.mockClear();
  doLogout.mockClear();
});

function storageEvent(key: string, newValue: string): Event {
  const e = new Event("storage");
  Object.defineProperty(e, "key", { value: key });
  Object.defineProperty(e, "newValue", { value: newValue });
  return e;
}

describe("useSessionRefresh", () => {
  it("adopts a fresh token from another tab's storage event", () => {
    renderHook(() => useSessionRefresh({ applySession, setRefreshToken, doLogout, authUser: AUTH }));
    act(() => {
      window.dispatchEvent(storageEvent("muse_user", JSON.stringify({ access_token: "A", refresh_token: "R" })));
    });
    expect(setRefreshToken).toHaveBeenCalledWith("R");
    expect(applySession).toHaveBeenCalledWith("A", "R");
  });

  it("ignores storage events for other keys", () => {
    renderHook(() => useSessionRefresh({ applySession, setRefreshToken, doLogout, authUser: AUTH }));
    act(() => { window.dispatchEvent(storageEvent("muse_other", JSON.stringify({ access_token: "A" }))); });
    expect(applySession).not.toHaveBeenCalled();
  });

  it("logs out only once per dead session", () => {
    renderHook(() => useSessionRefresh({ applySession, setRefreshToken, doLogout, authUser: AUTH }));
    act(() => {
      window.dispatchEvent(new Event("muse:session-expired"));
      window.dispatchEvent(new Event("muse:session-expired"));
    });
    expect(doLogout).toHaveBeenCalledTimes(1);
  });
});
