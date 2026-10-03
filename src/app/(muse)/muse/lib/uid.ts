let _idCounter = 0;
let _lastTimestamp = 0;

/**
 * Monotonic local id for React keys / optimistic rows.
 *
 * Collision fix (2026-10-03, caught by uid.test.ts): this used to be
 * `now * 10000 + counter`. `now` is epoch-milliseconds (~1.7e12 in 2025+), and
 * 1.7e12 * 10000 = 1.7e16 exceeds Number.MAX_SAFE_INTEGER (9.007e15), so the
 * sum lost precision and distinct calls returned IDENTICAL values (a 1000-call
 * loop produced only ~500 unique ids). `now * 1000` stays inside the safe
 * range (1.7e15); the counter gives up to 1000 unique ids per millisecond,
 * which is more than enough for optimistic UI rows.
 */
export function uid(): number {
  const now = Date.now();
  if (now === _lastTimestamp) {
    _idCounter++;
  } else {
    _lastTimestamp = now;
    _idCounter = 0;
  }
  return now * 1000 + (_idCounter % 1000);
}
