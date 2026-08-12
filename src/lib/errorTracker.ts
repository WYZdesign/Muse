/**
 * Lightweight error tracker for Muse app.
 * Logs to console in dev; ready for Sentry/DataDog integration.
 */

interface TrackedError {
  name: string;
  params: Record<string, unknown>;
  time: string;
  url?: string;
}

const MAX_QUEUE = 50;
const queue: TrackedError[] = [];

function flushQueue() {
  while (queue.length > 0) {
    const item = queue.shift();
    if (item) {
      navigator.sendBeacon(
        "/api/muse",
        JSON.stringify({ action: "track-error", ...item })
      );
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushQueue);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushQueue();
  });
}

export function trackError(name: string, params?: Record<string, unknown>) {
  const entry: TrackedError = {
    name,
    params: params || {},
    time: new Date().toISOString(),
  };

  try {
    entry.url = window.location.href;
  } catch {}

  if (typeof console !== "undefined") {
    console.error("[muse:error]", name, params || "", entry.time);
  }

  queue.push(entry);
  if (queue.length > MAX_QUEUE) queue.shift();
}
