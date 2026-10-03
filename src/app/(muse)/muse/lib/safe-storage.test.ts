import { describe, it, expect, vi, afterEach } from "vitest";
import { safeSetItem, safeGetItem, safeRemoveItem, setRefreshToken, getRefreshToken, clearRefreshToken } from "./safe-storage";

function memStorage(): Storage {
  const m = new Map<string, string>();
  const store = {
    getItem: (k: string): string | null => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string): void => { m.set(k, v); },
    removeItem: (k: string): void => { m.delete(k); },
    clear: (): void => { m.clear(); },
    key: (_i: number): string | null => null,
    length: 0,
  };
  return store as unknown as Storage;
}

afterEach(() => vi.unstubAllGlobals());

describe("safe-storage", () => {
  it("round-trips a value through safeSetItem/safeGetItem/safeRemoveItem", () => {
    vi.stubGlobal("localStorage", memStorage());
    expect(safeSetItem("k1", "hello")).toBe(true);
    expect(safeGetItem("k1")).toBe("hello");
    safeRemoveItem("k1");
    expect(safeGetItem("k1")).toBeNull();
  });

  it("keeps the refresh token in sessionStorage only, and clears it", () => {
    const session = memStorage();
    vi.stubGlobal("sessionStorage", session);
    setRefreshToken("tok-123");
    expect(getRefreshToken()).toBe("tok-123");
    expect(session.getItem("muse_refresh_token")).toBe("tok-123");
    clearRefreshToken();
    expect(getRefreshToken()).toBe("");
  });

  it("does not throw and signals quota when localStorage.setItem throws", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    vi.stubGlobal("localStorage", {
      getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); },
      removeItem: () => {}, clear: () => {}, key: () => null, length: 0,
    } as unknown as Storage);
    expect(() => safeSetItem("k2", "v")).not.toThrow();
    expect(dispatch).toHaveBeenCalled();
  });

  it("safeGetItem returns null when localStorage.getItem throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null, length: 0,
    } as unknown as Storage);
    expect(safeGetItem("k-never-set")).toBeNull();
  });
});
