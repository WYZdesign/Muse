// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: { channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }), removeChannel: () => {} } }));
vi.mock("../lib/auth-client", () => ({ authFetch: vi.fn(async () => new Response("{}", { status: 200 })) }));

import { renderHook, cleanup } from "@testing-library/react";
import { useCall } from "./useCall";

afterEach(() => cleanup());

describe("useCall", () => {
  it("initializes with no incoming/active call and exposes handlers", () => {
    const { result } = renderHook(() => useCall("my-id"));
    expect(result.current.incoming).toBeNull();
    expect(result.current.active).toBeNull();
    for (const k of ["startCall", "acceptCall", "declineCall", "endCall"]) {
      expect(typeof (result.current as Record<string, unknown>)[k], k).toBe("function");
    }
  });
});
