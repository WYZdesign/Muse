import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSafeObserver } from "./safe-observer";

/**
 * Regression coverage for the circuit breaker that guards against the
 * app-wide freeze bug (see safe-observer.ts header comment): a
 * MutationObserver whose callback triggers further matching mutations can
 * starve the main thread indefinitely with no JS error ever thrown. This
 * test environment has no real DOM, so it stubs a minimal fake
 * MutationObserver that the test drives directly — the important behavior
 * under test is purely the rate-counting/trip logic, which doesn't need a
 * real DOM to exercise.
 */

type FakeInstance = { callback: MutationCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };

function installFakeMutationObserver() {
  const instances: FakeInstance[] = [];
  class FakeMutationObserver {
    callback: MutationCallback;
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(cb: MutationCallback) {
      this.callback = cb;
      instances.push(this as unknown as FakeInstance);
    }
  }
  vi.stubGlobal("MutationObserver", FakeMutationObserver);
  const dispatched: CustomEvent[] = [];
  vi.stubGlobal("window", { dispatchEvent: (e: CustomEvent) => dispatched.push(e) });
  vi.stubGlobal("CustomEvent", class { type: string; detail: any; constructor(type: string, init?: any) { this.type = type; this.detail = init?.detail; } });
  return { instances, dispatched };
}

beforeEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("createSafeObserver", () => {
  it("forwards normal-rate mutations to the real callback", () => {
    const { instances } = installFakeMutationObserver();
    const seen: number[] = [];
    const handle = createSafeObserver((muts) => seen.push(muts.length), { label: "test", maxFiringsPerWindow: 5, windowMs: 1000 });
    handle.observe({} as any, { childList: true });

    const fake = instances[0];
    fake.callback([{} as MutationRecord], fake as any);
    fake.callback([{} as MutationRecord], fake as any);

    expect(seen).toEqual([1, 1]);
    expect(fake.disconnect).not.toHaveBeenCalled();
  });

  it("trips and disconnects once firings exceed the window threshold, and stops forwarding", () => {
    const { instances, dispatched } = installFakeMutationObserver();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const seen: number[] = [];
    const handle = createSafeObserver((muts) => seen.push(muts.length), { label: "runaway", maxFiringsPerWindow: 3, windowMs: 1000 });
    handle.observe({} as any, { childList: true });

    const fake = instances[0];
    // Fire well past the threshold in rapid succession (simulating a
    // self-feeding mutation storm) — Date.now() timestamps will all land
    // inside the same rolling window since this runs synchronously.
    for (let i = 0; i < 10; i++) fake.callback([{} as MutationRecord], fake as any);

    // Circuit breaker should have tripped after the 4th firing (threshold 3)
    // and stopped calling the real callback from then on.
    expect(seen.length).toBeLessThan(10);
    expect(fake.disconnect).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe("muse:observer-tripped");
    expect((dispatched[0] as any).detail.label).toBe("runaway");
  });

  it("observe() is a no-op once tripped, so a caller can't resurrect a runaway observer", () => {
    const { instances } = installFakeMutationObserver();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handle = createSafeObserver(() => {}, { label: "runaway", maxFiringsPerWindow: 1, windowMs: 1000 });
    handle.observe({} as any, {});
    const fake = instances[0];
    fake.callback([{} as MutationRecord], fake as any);
    fake.callback([{} as MutationRecord], fake as any); // trips here

    fake.observe.mockClear();
    handle.observe({} as any, {}); // should be swallowed, not re-armed
    expect(fake.observe).not.toHaveBeenCalled();
  });
});
