const QUOTA_MSG = "Storage full — some settings may not persist. Try freeing space or exporting your data.";

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || (e instanceof Error && /quota/i.test(e.message))) {
      try { console.warn(`[storage] quota exceeded for "${key}"`); } catch {}
      window.dispatchEvent(new CustomEvent("muse:storage-quota"));
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function safeRemoveItem(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}

export { QUOTA_MSG };
