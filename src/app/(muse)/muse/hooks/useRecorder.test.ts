// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../lib/auth-client", () => ({ authFetch: vi.fn(async () => new Response("{}", { status: 200 })) }));

import { renderHook, cleanup } from "@testing-library/react";
import { useRecorder } from "./useRecorder";

afterEach(() => cleanup());

describe("useRecorder", () => {
  it("starts idle and exposes record controls", () => {
    const { result } = renderHook(() => useRecorder({ uploadMedia: vi.fn(async () => null), onDone: vi.fn() }));
    expect(result.current.recording).toBeNull();
    expect(result.current.showConsent).toBe(false);
    const handlers = Object.entries(result.current).filter(([, v]) => typeof v === "function").map(([k]) => k);
    expect(handlers.length).toBeGreaterThan(0);
  });
});
