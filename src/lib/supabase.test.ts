import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// createClient is recorded globally so the module can be re-imported with
// different env without losing call history.
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: any[]) => (globalThis as any).__createClient(...args),
}));

function client(url: string, key: string, opts: any) {
  return { url, key, opts, tag: "client" };
}

async function load(env: Record<string, string>): Promise<typeof import("./supabase")> {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return await import("./supabase");
}

beforeEach(() => {
  (globalThis as any).__createClient = vi.fn(client);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getServiceClient", () => {
  it("uses the service-role env pair when present", async () => {
    const mod = await load({
      NEXT_PUBLIC_SUPABASE_URL: "https://anon.example",
      SUPABASE_URL: "https://svc.example",
      SUPABASE_SECRET_KEY: "svc-secret",
    });
    mod.getServiceClient();
    const [url, key, opts] = (globalThis as any).__createClient.mock.calls.at(-1)!;
    expect(url).toBe("https://svc.example");
    expect(key).toBe("svc-secret");
    expect(opts.auth.persistSession).toBe(false);
  });

  it("falls back to the public URL and the legacy service role key", async () => {
    const mod = await load({
      NEXT_PUBLIC_SUPABASE_URL: "https://anon.example",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-role",
    });
    mod.getServiceClient();
    const [url, key] = (globalThis as any).__createClient.mock.calls.at(-1)!;
    expect(url).toBe("https://anon.example");
    expect(key).toBe("legacy-role");
  });

  it("passes empty strings rather than throwing when env is missing", async () => {
    const mod = await load({});
    expect(() => mod.getServiceClient()).not.toThrow();
    const [url, key] = (globalThis as any).__createClient.mock.calls.at(-1)!;
    expect(url).toBe("");
    expect(key).toBe("");
  });
});

describe("getUserScopedClient", () => {
  it("carries the caller's token as its Authorization header", async () => {
    const mod = await load({
      NEXT_PUBLIC_SUPABASE_URL: "https://anon.example",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    mod.getUserScopedClient("tok-123");
    const [url, key, opts] = (globalThis as any).__createClient.mock.calls.at(-1)!;
    expect(url).toBe("https://anon.example");
    expect(key).toBe("anon-key");
    expect(opts.auth.persistSession).toBe(false);
    expect(opts.global.headers.Authorization).toBe("Bearer tok-123");
  });

  it("falls back to the publishable key when the anon key is absent", async () => {
    const mod = await load({
      NEXT_PUBLIC_SUPABASE_URL: "https://anon.example",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    });
    mod.getUserScopedClient("tok");
    expect((globalThis as any).__createClient.mock.calls.at(-1)![1]).toBe("pub-key");
  });
});

describe("supabase lazy proxy", () => {
  it("creates the client once on first property access and caches it", async () => {
    const mod = await load({
      NEXT_PUBLIC_SUPABASE_URL: "https://anon.example",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    // No client yet
    expect((globalThis as any).__createClient).not.toHaveBeenCalled();

    // Access twice — the getter must reuse the singleton.
    void (mod.supabase as any).auth;
    void (mod.supabase as any).from;
    expect((globalThis as any).__createClient).toHaveBeenCalledTimes(1);
    const [url, key, opts] = (globalThis as any).__createClient.mock.calls[0];
    expect(url).toBe("https://anon.example");
    expect(key).toBe("anon-key");
    expect(opts.auth.persistSession).toBe(true);
    expect(opts.auth.autoRefreshToken).toBe(true);
  });
});
