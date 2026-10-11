// Shared fluent Supabase mock for unit tests.
//
// Lives outside src/lib on purpose: vitest coverage includes only
// src/lib/**/*.ts, so this helper never dilutes (or pads) the coverage numbers.
//
// Usage:
//   const sb = createSb((table, calls) => {
//     if (table === "muse_profiles") return { data: row, error: null };
//     return { data: [], error: null };
//   });
//   globalThis.__sbMock = sb;
//
// Every chainable method is recorded (in call order) so tests can assert the
// QUERY SHAPE, not just the returned value. `sb.__log` holds every call across
// every table; `tableCalls(sb.__log, "...")` filters it.

// A value recorded in the call log. Fixtures and query arguments are
// heterogeneous, so a recorded arg is fundamentally opaque. Tests compare it
// directly to string/number literals (`call.args[0] === "id"`, `=== 5000`) and
// read dynamic fields off it (`.rules`, `.preferences.portfolioVisibility`),
// which a plain `unknown` cannot satisfy. The primitive intersection keeps it
// comparable to those literals while the index signature keeps nested field
// reads valid; every level stays the same recursive shape.
type SbArg = (string | number | boolean | null) & { [key: string]: SbArg };

export interface SbCall {
  table: string;
  method: string;
  args: SbArg[];
}

export interface SbResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

export type SbResolver = (
  table: string,
  calls: SbCall[],
) => SbResult | Promise<SbResult>;

// The chainable query builder the mock hands back from `.from(...)`. Every
// recorded chain/mutation method (and any other property lookup) returns the
// same builder so calls keep chaining; the await/catch/finally members settle
// it. A single string index signature covers the dynamically-recorded names.
type SbChain = (...args: SbArg[]) => SbQuery;
type SbSettle = () => Promise<SbResult>;
type SbThen = (onFulfilled: (value: SbResult) => unknown, onRejected: (reason: unknown) => unknown) => Promise<unknown>;
type SbCatch = (onRejected: (reason: unknown) => unknown) => Promise<unknown>;
type SbFinally = (onFinally: () => void) => Promise<SbResult>;

interface SbQuery {
  [method: string]: SbChain | SbSettle | SbThen | SbCatch | SbFinally;
}

export interface SbMock {
  from(table: string): SbQuery;
  rpc(name: string, args?: unknown): Promise<SbResult>;
  storage: { from(bucket: string): { createSignedUrl(path: string, ttl: number): Promise<SbResult> } };
  __log: SbCall[];
}

const CHAIN_METHODS = [
  "select", "eq", "neq", "in", "or", "gte", "lte", "gt", "lt",
  "order", "limit", "range", "contains", "containedBy", "ilike", "not",
  "is", "filter", "match", "textSearch", "overlaps",
];

const MUTATION_METHODS = ["insert", "update", "upsert", "delete"];

export function createSb(resolve: SbResolver): SbMock {
  const log: SbCall[] = [];

  const from = (table: string): SbQuery => {
    const calls: SbCall[] = [];
    const q: SbQuery = {};
    const record = (method: string): SbChain =>
      (...args: SbArg[]) => {
        const call: SbCall = { table, method, args };
        calls.push(call);
        log.push(call);
        return q;
      };
    for (const m of [...CHAIN_METHODS, ...MUTATION_METHODS]) q[m] = record(m);

    const settle = () => Promise.resolve(resolve(table, calls));
    q.maybeSingle = () => settle();
    q.single = () => settle();
    q.then = (onFulfilled: (value: SbResult) => unknown, onRejected: (reason: unknown) => unknown) => settle().then(onFulfilled, onRejected);
    q.catch = (fn: (reason: unknown) => unknown) => settle().catch(fn);
    q.finally = (fn: () => void) => settle().finally(fn);
    return q;
  };

  const rpc = (name: string, args?: SbArg) => {
    const call: SbCall = { table: `rpc:${name}`, method: "rpc", args: [args as SbArg] };
    log.push(call);
    return Promise.resolve(resolve(`rpc:${name}`, [call]));
  };

  const storage = {
    from: (bucket: string) => ({
      createSignedUrl: (path: string, ttl: number) => {
        const call: SbCall = { table: "storage", method: "createSignedUrl", args: [bucket, path, ttl] as SbArg[] };
        log.push(call);
        return Promise.resolve(resolve("storage", [call]));
      },
    }),
  };

  return { from, rpc, storage, __log: log };
}

export function tableCalls(log: SbCall[], table: string): SbCall[] {
  return log.filter((c) => c.table === table);
}

export function findCall(calls: SbCall[], method: string): SbCall | undefined {
  return [...calls].reverse().find((c) => c.method === method);
}

export function callArgs(calls: SbCall[], method: string): SbArg[] | undefined {
  return findCall(calls, method)?.args;
}

export function insertValue(calls: SbCall[]): SbArg {
  return (callArgs(calls, "insert") ?? [])[0];
}

export function updateValue(calls: SbCall[]): SbArg {
  return (callArgs(calls, "update") ?? [])[0];
}

export function upsertValue(calls: SbCall[]): SbArg {
  return (callArgs(calls, "upsert") ?? [])[0];
}

export function filtersOf(calls: SbCall[], method: string): SbArg[][] {
  return calls.filter((c) => c.method === method).map((c) => c.args);
}

/** The string passed to the most recent `.select(...)` ("" if none). */
export function selectArg(calls: SbCall[]): string {
  const c = [...calls].reverse().find((x) => x.method === "select");
  return typeof c?.args[0] === "string" ? c.args[0] : "";
}

/** The value most recently `.eq(field, value)`d. */
export function eqOf(calls: SbCall[], field: string): SbArg | undefined {
  const c = [...calls].reverse().find((x) => x.method === "eq" && x.args[0] === field);
  return c?.args[1];
}

/**
 * Build a mock Supabase client from a table→handler map. Unknown tables return
 * `{ data: null, error: null }`. A `.auth.getUser` stub returns the current
 * `globalThis.__authUser` so route-style code resolves.
 */
export function makeSb(handlers: Record<string, (calls: SbCall[]) => SbResult>): SbMock & { auth: { getUser: () => Promise<{ data: { user: unknown }; error: null }> } } {
  const sb = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  return Object.assign(sb, {
    auth: { getUser: async () => ({ data: { user: (globalThis as { __authUser?: unknown }).__authUser }, error: null }) },
  });
}
