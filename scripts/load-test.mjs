#!/usr/bin/env node
/**
 * Load test with no dependencies (Node 22 has global fetch).
 *
 * Fires N concurrent workers at a URL for a fixed duration and reports
 * throughput and latency percentiles. Safe to point at a preview/staging
 * deployment; do not point it at production without warning the owner.
 *
 *   node scripts/load-test.mjs --url https://staging.example/api/health \
 *     --duration 15 --concurrency 20
 *
 * Flags: --url (required), --duration seconds (default 15),
 *        --concurrency (default 20), --timeout ms (default 10000), --expect <substr>
 */
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]?.startsWith("--") ? true : arr[i + 1]]);
    return acc;
  }, []),
);

const url = args.url;
if (!url) {
  console.error("usage: node scripts/load-test.mjs --url <url> [--duration s] [--concurrency n] [--timeout ms] [--expect substr]");
  process.exit(2);
}
const durationS = Number(args.duration ?? 15);
const concurrency = Number(args.concurrency ?? 20);
const timeoutMs = Number(args.timeout ?? 10000);
const expect = typeof args.expect === "string" ? args.expect : null;

const latencies = [];
let ok = 0;
let failed = 0;
const errors = new Map();
const started = Date.now();
const deadline = started + durationS * 1000;

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

async function worker() {
  while (Date.now() < deadline) {
    const t0 = performance.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "wyz-loadtest/1.0" } });
      const body = expect ? await res.text() : "";
      clearTimeout(timer);
      const ms = performance.now() - t0;
      if (res.ok && (!expect || body.includes(expect))) {
        ok += 1;
        latencies.push(ms);
      } else {
        failed += 1;
        const k = `HTTP ${res.status}${expect && !body.includes(expect) ? " (body mismatch)" : ""}`;
        errors.set(k, (errors.get(k) ?? 0) + 1);
      }
    } catch (e) {
      failed += 1;
      const k = e.name === "AbortError" ? `timeout >${timeoutMs}ms` : e.name;
      errors.set(k, (errors.get(k) ?? 0) + 1);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const elapsed = (Date.now() - started) / 1000;
const total = ok + failed;
const sorted = latencies.slice().sort((a, b) => a - b);
const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;

console.log(`\nLOAD TEST  ${url}`);
console.log(`  duration ${elapsed.toFixed(1)}s  concurrency ${concurrency}  expect ${expect ? JSON.stringify(expect) : "(any 2xx)"}`);
console.log(`  requests ${total}  ok ${ok}  failed ${failed}  (${((failed / (total || 1)) * 100).toFixed(1)}% errors)`);
console.log(`  throughput ${(total / elapsed).toFixed(1)} req/s`);
console.log(`  latency ms  avg ${avg.toFixed(1)}  p50 ${pct(sorted, 50).toFixed(1)}  p90 ${pct(sorted, 90).toFixed(1)}  p95 ${pct(sorted, 95).toFixed(1)}  p99 ${pct(sorted, 99).toFixed(1)}  max ${(sorted[sorted.length - 1] ?? 0).toFixed(1)}`);
if (errors.size) {
  console.log("  errors:");
  for (const [k, v] of [...errors.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${v} x ${k}`);
}
process.exit(failed > 0 && ok === 0 ? 1 : 0);
