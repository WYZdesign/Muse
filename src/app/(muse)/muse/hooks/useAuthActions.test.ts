// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../lib/analytics", () => ({ analytics: { identify: vi.fn(), messageSend: vi.fn() } }));
vi.mock("../lib/api", () => ({ fetchWithTimeout: vi.fn(async () => new Response("{}", { status: 200 })) }));

import { renderHook, cleanup } from "@testing-library/react";
import { useAuthActions } from "./useAuthActions";

afterEach(() => cleanup());

describe("useAuthActions", () => {
  it("exposes the auth handlers", () => {
    const { result } = renderHook(() => useAuthActions({} as never));
    const handlers = Object.entries(result.current).filter(([, v]) => typeof v === "function").map(([k]) => k);
    expect(handlers.length).toBeGreaterThan(0);
  });
});
