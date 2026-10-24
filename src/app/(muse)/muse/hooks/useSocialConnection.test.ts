// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";

// Mutable fixture so individual tests can flip closed-beta mode and the token.
const state = vi.hoisted(() => ({ hideSocial: false, token: "test-token" }));

vi.mock("@/lib/config", () => ({
  get MUSE_CLOSED_BETA_HIDE_SOCIAL() {
    return state.hideSocial;
  },
}));
vi.mock("../lib/api", () => ({
  getAccessToken: () => state.token,
}));

import { useSocialConnection } from "./useSocialConnection";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/muse");
  state.hideSocial = false;
  state.token = "test-token";
});
beforeEach(() => {
  state.hideSocial = false;
  state.token = "test-token";
});

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

describe("useSocialConnection", () => {
  it("loads connected-account status once a session token exists", async () => {
    const setObConnectedSocials = vi.fn();
    const authFetch = vi.fn(async () => json({ connected: { instagram: true } }));
    renderHook(() => useSocialConnection({ authFetch, setObConnectedSocials, showToast: vi.fn() }));
    await waitFor(() => expect(setObConnectedSocials).toHaveBeenCalledWith({ instagram: true }));
  });

  it("does not call the API while there is no session token", async () => {
    state.token = "";
    const authFetch = vi.fn(async () => json({ connected: { instagram: true } }));
    renderHook(() => useSocialConnection({ authFetch, setObConnectedSocials: vi.fn(), showToast: vi.fn() }));
    // Give the retry loop more than one tick to prove it stays quiet.
    await new Promise((r) => setTimeout(r, 400));
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("skips the status call entirely when social is hidden in closed beta", async () => {
    state.hideSocial = true;
    const authFetch = vi.fn(async () => json({ connected: { instagram: true } }));
    renderHook(() => useSocialConnection({ authFetch, setObConnectedSocials: vi.fn(), showToast: vi.fn() }));
    await new Promise((r) => setTimeout(r, 200));
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("handles the ?connected= OAuth return", () => {
    window.history.replaceState({}, "", "/muse?connected=google");
    const setObConnectedSocials = vi.fn();
    const showToast = vi.fn();
    renderHook(() => useSocialConnection({ authFetch: vi.fn(async () => json({})), setObConnectedSocials, showToast }));
    expect(setObConnectedSocials).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Google connected"));
  });
});
