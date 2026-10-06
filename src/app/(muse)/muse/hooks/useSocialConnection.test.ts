// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useSocialConnection } from "./useSocialConnection";

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/muse"); });

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });

describe("useSocialConnection", () => {
  it("loads connected-account status on mount", async () => {
    const setObConnectedSocials = vi.fn();
    const authFetch = vi.fn(async () => json({ connected: { instagram: true } }));
    renderHook(() => useSocialConnection({ authFetch, setObConnectedSocials, showToast: vi.fn() }));
    await waitFor(() => expect(setObConnectedSocials).toHaveBeenCalledWith({ instagram: true }));
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
