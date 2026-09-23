/**
 * Circuit-breaker wrapper around MutationObserver.
 *
 * BACKGROUND: the app-wide freeze reported repeatedly as "froze after
 * login" / "black screen 2s into Discover" traced back to a MutationObserver
 * on document.body whose own callback caused (or could plausibly cause,
 * under any future edit) further mutations of the kind it was watching —
 * a self-feeding microtask storm that starves the main thread completely.
 * Once that happens the page is not just slow, it is unrecoverable from
 * within its own JS: rAF, postMessage, even DevTools script injection all
 * stop responding, because a runaway microtask queue never yields back to
 * the task queue. There is no "catch" for that after the fact — the only
 * real fix is to make it structurally impossible for an observer's own
 * callback to run away with the main thread.
 *
 * createSafeObserver() is a drop-in MutationObserver replacement that adds
 * a rate-based circuit breaker: if the callback fires more than
 * `maxFiringsPerWindow` times inside `windowMs`, it disconnects itself,
 * reports the trip (console.error + a `muse:observer-tripped` CustomEvent
 * so a monitoring layer can pick it up), and stops — trading "this one
 * feature stops updating" for "the entire app freezes". Every
 * MutationObserver in this codebase should be created through this
 * wrapper, not `new MutationObserver(...)` directly, so a bug like the one
 * above degrades gracefully instead of freezing the tab.
 */

export interface SafeObserverOptions {
  /** Max callback firings allowed inside `windowMs` before tripping. Default 40. */
  maxFiringsPerWindow?: number;
  /** Rolling window (ms) the firing count is measured over. Default 500. */
  windowMs?: number;
  /** Label used in the console.error / CustomEvent detail when tripped. */
  label: string;
}

export interface SafeObserverHandle {
  observe: (target: Node, options?: MutationObserverInit) => void;
  disconnect: () => void;
}

export function createSafeObserver(
  callback: MutationCallback,
  opts: SafeObserverOptions
): SafeObserverHandle {
  const maxFiringsPerWindow = opts.maxFiringsPerWindow ?? 40;
  const windowMs = opts.windowMs ?? 500;
  const label = opts.label;

  let firingTimestamps: number[] = [];
  let tripped = false;
  let observer: MutationObserver | null = null;

  const trip = () => {
    tripped = true;
    try { observer?.disconnect(); } catch {}
    const message = `[safeObserver] "${label}" exceeded ${maxFiringsPerWindow} firings/${windowMs}ms — disconnected to prevent a main-thread freeze. This observer (or something it watches) likely needs a narrower target/attributeFilter.`;
    console.error(message);
    try {
      window.dispatchEvent(new CustomEvent("muse:observer-tripped", { detail: { label, maxFiringsPerWindow, windowMs } }));
    } catch {
      // intentionally ignored - observer already dead
    }
  };

  const guardedCallback: MutationCallback = (mutations, obs) => {
    if (tripped) return;
    const now = Date.now();
    firingTimestamps.push(now);
    // Drop timestamps outside the rolling window — O(1) amortized since we
    // only ever trim from the front.
    const cutoff = now - windowMs;
    while (firingTimestamps.length && firingTimestamps[0] < cutoff) firingTimestamps.shift();
    if (firingTimestamps.length > maxFiringsPerWindow) {
      trip();
      return;
    }
    callback(mutations, obs);
  };

  observer = new MutationObserver(guardedCallback);

  return {
    observe: (target, options) => {
      if (tripped) return;
      observer!.observe(target, options);
    },
    disconnect: () => {
      firingTimestamps = [];
      try { observer?.disconnect(); } catch {
        // intentionally ignored - observer already dead
      }
    },
  };
}
