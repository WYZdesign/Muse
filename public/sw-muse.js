/* Muse PWA Service Worker, scoped push notifications */

const CACHE = "muse-shell-v6";
// NOTE: do NOT pre-cache "/muse" (the app HTML shell). A cached shell
// references old /_next/ chunk filenames that 404 after a redeploy -> blank
// screen. Only offline page + static assets are safe to cache.
const SHELL = ["/muse/offline", "/manifest.webmanifest", "/favicon-192x192.png"];

// Runtime cache bounds. The SW scope is "/", so it sees every request the
// whole site makes, and public/ ships ~1000 gallery images (~228MB, several
// over 4MB) plus a 5MB intro video. Unbounded caching silently filled Cache
// Storage with gigabytes that browsers do not evict, which pushes other
// origins out of the cache and degrades launch time on phones. Only small
// responses qualify, and entries are capped oldest-first via an LRU index.
const INDEX_KEY = "/__muse_cache_lru__";
const MAX_ENTRY_BYTES = 512 * 1024;
const MAX_ENTRIES = 120;

function cacheable(resp) {
  const ct = (resp.headers.get("content-type") || "").split(";")[0].trim();
  if (/^(video|audio)\//.test(ct)) return false;
  // No Content-Length means we cannot tell how big it is before buffering it,
  // so decline rather than risk a multi-MB write.
  const raw = resp.headers.get("content-length");
  if (!raw) return false;
  return Number(raw) <= MAX_ENTRY_BYTES;
}

function readIndex(cache) {
  return cache.match(INDEX_KEY).then((r) => (r ? r.json() : [])).catch(() => []);
}

function writeIndex(cache, list) {
  return cache.put(INDEX_KEY, new Response(JSON.stringify(list), { headers: { "content-type": "application/json" } }));
}

// Insert with an LRU cap: newest last, and anything past MAX_ENTRIES is
// dropped from the front. Entries that predate the index (and the precached
// shell) are simply not tracked, so they can never be evicted.
async function putBounded(req, resp) {
  const cache = await caches.open(CACHE);
  const url = typeof req === "string" ? req : req.url;
  await cache.put(req, resp);
  const list = (await readIndex(cache)).filter((u) => u !== url);
  list.push(url);
  const overflow = list.length - MAX_ENTRIES;
  if (overflow > 0) {
    const evict = list.splice(0, overflow);
    await Promise.all(evict.map((u) => cache.delete(u).catch(() => {})));
  }
  await writeIndex(cache, list);
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Muses by WYZ", body: "You have a new notification" };
  try {
    if (event.data) payload = Object.assign(payload, event.data.json());
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  const title = payload.title || "Muses by WYZ";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon-192x192.png",
    badge: payload.badge || "/favicon-192x192.png",
    data: payload.data || { url: "/muse" },
    tag: payload.tag || undefined,
    requireInteraction: payload.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/muse";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const url = client.url || "";
        if (url.indexOf(targetUrl) !== -1 && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = req.url;
  if (url.indexOf("/api/") !== -1) return;
  if (url.indexOf(INDEX_KEY) !== -1) return;
  // Never cache Next.js build assets, they use content hashing for cache busting
  if (url.indexOf("/_next/") !== -1) return;

  // Navigation requests: network-first, fallback to cache only when offline.
  // (Stale HTML shell references old /_next/ chunk names that 404 on the new
  // deploy, and serving it online causes a blank screen. Always hit the network,
  // and never cache.put HTML navigations at all.)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/muse/offline")))
    );
    return;
  }

  // Stale-while-revalidate: answer from cache immediately when we have it,
  // and refresh it in the background. Cold requests pay one network round
  // trip; everything after that is instant and self-healing.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic" && cacheable(resp)) {
            const copy = resp.clone();
            putBounded(req, copy).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
