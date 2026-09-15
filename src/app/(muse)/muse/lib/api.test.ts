import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout } from "./api";

/**
 * Regression coverage for the fetch-timeout hardening: every fetch() in
 * this app used to have no timeout at all, so a stuck connection (server
 * accepts the socket but never responds) left the calling UI in a
 * "Loading..." state forever — the same "should finish but never does"
 * shape as the MutationObserver freeze, just at the network layer. These
 * tests exercise fetchWithTimeout in isolation with a mocked global fetch
 * so nothing here makes a real network call.
 */

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("fetchWithTimeout", () => {
  it("resolves normally when the request finishes before the timeout", async () => {
    const fakeResponse = { ok: true } as Response;
    const fetchMock = vi.fn((_url: string, _opts?: RequestInit) => Promise.resolve(fakeResponse));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWithTimeout("https://example.test/x", { timeoutMs: 5000 });
    expect(result).toBe(fakeResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A real AbortSignal was attached even though it never fired.
    const passedOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(passedOptions.signal).toBeInstanceOf(AbortSignal);
    expect(passedOptions.signal!.aborted).toBe(false);
  });

  it("aborts and rejects once the timeout elapses on a hung request", async () => {
    // Simulate a fetch that never resolves on its own — the request is
    // stuck exactly like a server that accepted the connection but never
    // responded. fetchWithTimeout must still reject once its own timer
    // fires, rather than hanging forever.
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url: string, opts?: RequestInit) => {
      capturedSignal = opts?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchWithTimeout("https://example.test/hangs", { timeoutMs: 1000 });
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("does not override a caller-supplied AbortSignal", async () => {
    const fetchMock = vi.fn((_url: string, _opts?: RequestInit) => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal("fetch", fetchMock);
    const ownController = new AbortController();

    await fetchWithTimeout("https://example.test/y", { signal: ownController.signal, timeoutMs: 5000 });
    const passedOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(passedOptions.signal).toBe(ownController.signal);
  });

  it("uses the default timeout when none is specified", async () => {
    const fetchMock = vi.fn((_url: string, opts?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        opts?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchWithTimeout("https://example.test/z");
    const assertion = expect(pending).rejects.toThrow();
    // Default is 15000ms — anything short of that must not have aborted yet.
    await vi.advanceTimersByTimeAsync(14999);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });
});
