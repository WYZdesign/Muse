const QUOTA_MSG = "Storage full — some settings may not persist. Try freeing space or exporting your data.";

// IndexedDB fallback for values that exceed localStorage space
let _dbPromise: Promise<IDBDatabase> | null = null;
const IDB_NAME = "muse_kv";
const IDB_STORE = "kv";

function getDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { _dbPromise = null; reject(req.error); };
  });
  return _dbPromise;
}

async function idbSet(key: string, value: string): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise<boolean>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch { return false; }
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise<string | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as string) || null);
      tx.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbRemove(key: string): Promise<void> {
  try { const db = await getDB(); db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).delete(key); } catch {}
}

// In-memory cache for fast reads of IndexedDB-backed values
const _memCache = new Map<string, string>();

export function safeSetItem(key: string, value: string): boolean {
  _memCache.set(key, value);
  if (value.length < 50_000) {
    try { localStorage.setItem(key, value); return true; } catch {}
  }
  idbSet(key, value);
  return true;
}

export function safeGetItem(key: string): string | null {
  if (_memCache.has(key)) return _memCache.get(key)!;
  const localVal = (() => { try { return localStorage.getItem(key); } catch { return null; } })();
  if (localVal) { _memCache.set(key, localVal); return localVal; }
  idbGet(key).then(v => { if (v) _memCache.set(key, v); });
  return null;
}

export function safeRemoveItem(key: string): void {
  _memCache.delete(key);
  try { localStorage.removeItem(key); } catch {}
  idbRemove(key);
}

export async function safeGetItemAsync(key: string): Promise<string | null> {
  const cached = safeGetItem(key);
  if (cached) return cached;
  return idbGet(key);
}

export { QUOTA_MSG };
