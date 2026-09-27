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

export interface SbCall {
  table: string;
  method: string;
  args: any[];
}

export interface SbResult {
  data?: any;
  error?: any;
  count?: number | null;
}

export type SbResolver = (
  table: string,
  calls: SbCall[],
) => SbResult | Promise<SbResult>;

export interface SbMock {
  from(table: string): any;
  rpc(name: string, args?: any): Promise<SbResult>;
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
  const sb: any = {};

  sb.from = (table: string) => {
    const calls: SbCall[] = [];
    const q: any = {};
    const record = (method: string) =>
      (...args: any[]) => {
        const call = { table, method, args };
        calls.push(call);
        log.push(call);
        return q;
      };
    for (const m of [...CHAIN_METHODS, ...MUTATION_METHODS]) q[m] = record(m);

    const settle = () => Promise.resolve(resolve(table, calls));
    q.maybeSingle = () => settle();
    q.single = () => settle();
    q.then = (onFulfilled: any, onRejected: any) => settle().then(onFulfilled, onRejected);
    q.catch = (fn: any) => settle().catch(fn);
    q.finally = (fn: any) => settle().finally(fn);
    return q;
  };

  sb.rpc = (name: string, args?: any) => {
    const call = { table: `rpc:${name}`, method: "rpc", args: [args] };
    log.push(call);
    return Promise.resolve(resolve(`rpc:${name}`, [call]));
  };

  sb.storage = {
    from: (bucket: string) => ({
      createSignedUrl: (path: string, ttl: number) => {
        const call = { table: "storage", method: "createSignedUrl", args: [bucket, path, ttl] };
        log.push(call);
        return Promise.resolve(resolve("storage", [call]));
      },
    }),
  };

  sb.__log = log;
  return sb as SbMock;
}

export function tableCalls(log: SbCall[], table: string): SbCall[] {
  return log.filter((c) => c.table === table);
}

export function findCall(calls: SbCall[], method: string): SbCall | undefined {
  return [...calls].reverse().find((c) => c.method === method);
}

export function callArgs(calls: SbCall[], method: string): any[] | undefined {
  return findCall(calls, method)?.args;
}

export function insertValue(calls: SbCall[]): any {
  return callArgs(calls, "insert")?.[0];
}

export function updateValue(calls: SbCall[]): any {
  return callArgs(calls, "update")?.[0];
}

export function upsertValue(calls: SbCall[]): any {
  return callArgs(calls, "upsert")?.[0];
}

export function filtersOf(calls: SbCall[], method: string): any[][] {
  return calls.filter((c) => c.method === method).map((c) => c.args);
}

/** The string passed to the most recent `.select(...)` ("" if none). */
export function selectArg(calls: SbCall[]): string {
  const c = [...calls].reverse().find((x) => x.method === "select");
  return typeof c?.args[0] === "string" ? c.args[0] : "";
}

/** The value most recently `.eq(field, value)`d. */
export function eqOf(calls: SbCall[], field: string): any {
  const c = [...calls].reverse().find((x) => x.method === "eq" && x.args[0] === field);
  return c?.args[1];
}

/**
 * Build a mock Supabase client from a table→handler map. Unknown tables return
 * `{ data: null, error: null }`. A `.auth.getUser` stub returns the current
 * `globalThis.__authUser` so route-style code resolves.
 */
export function makeSb(handlers: Record<string, (calls: SbCall[]) => any>): SbMock & { auth: any } {
  const sb: any = createSb((table, calls) => {
    const h = handlers[table];
    return h ? h(calls) : { data: null, error: null };
  });
  sb.auth = { getUser: async () => ({ data: { user: (globalThis as any).__authUser }, error: null }) };
  return sb;
}
