import { describe, it, expect, vi, beforeEach } from "vitest";

const deletes: any[] = [];
const unsubInserts: any[] = [];

vi.mock("@/lib/supabase", () => ({
  getServiceClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "muse_waitlist") {
        return {
          delete: () => ({
            eq: (_col: string, val: string) => {
              deletes.push(val);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "muse_unsubscribes") {
        return {
          insert: (row: any) => {
            unsubInserts.push(row);
            const p: any = Promise.resolve({ error: null });
            p.then = Promise.resolve({ error: null }).then.bind(Promise.resolve({ error: null }));
            return Promise.resolve({ error: null }).then(() => undefined).catch(() => undefined) as any;
          },
        };
      }
      return { insert: async () => ({}) };
    },
  })),
}));
vi.mock("@/lib/email", () => ({
  verifyUnsubscribeToken: vi.fn((email: string, token: string) => token === "valid-token"),
}));

import { GET, POST } from "@/app/api/muse/unsubscribe/route";

function getReq(search = "") {
  const url = new URL(`https://muse.test/api/muse/unsubscribe${search}`);
  return { nextUrl: url, headers: { get: () => null } } as any;
}

function postReq(opts: {
  contentType?: string;
  body?: unknown;
  form?: Record<string, string>;
  headers?: Record<string, string>;
  search?: string;
}) {
  const url = new URL(`https://muse.test/api/muse/unsubscribe${opts.search || ""}`);
  return {
    nextUrl: url,
    headers: {
      get: (n: string) => {
        if (n === "content-type") return opts.contentType || null;
        if (n === "list-unsubscribe") return opts.headers?.["list-unsubscribe"] || null;
        return opts.headers?.[n] || null;
      },
    },
    json: async () => opts.body ?? {},
    formData: async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(opts.form || {})) fd.set(k, v);
      return fd;
    },
  } as any;
}

describe("unsubscribe route", () => {
  beforeEach(() => {
    deletes.length = 0;
    unsubInserts.length = 0;
    vi.stubEnv("MUSE_DEMO_MODE", "false");
  });

  it("409 demo mode on GET and POST", async () => {
    vi.stubEnv("MUSE_DEMO_MODE", "true");
    expect((await GET(getReq("?email=a@b.c&t=valid-token"))).status).toBe(409);
    expect((await POST(postReq({ contentType: "application/json", body: { email: "a@b.c", t: "valid-token" } }))).status).toBe(409);
  });

  it("GET invalid token renders 400 HTML", async () => {
    const r = await GET(getReq("?email=a@b.c&t=bad"));
    expect(r.status).toBe(400);
    expect(await r.text()).toMatch(/Invalid unsubscribe link/i);
  });

  it("GET missing email renders 400 HTML", async () => {
    const r = await GET(getReq("?t=valid-token"));
    expect(r.status).toBe(400);
  });

  it("GET valid token renders confirm page without mutating", async () => {
    const r = await GET(getReq("?email=a%40b.c&t=valid-token"));
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toMatch(/Confirm unsubscribe/i);
    expect(deletes.length).toBe(0);
  });

  it("POST invalid token returns 400 JSON", async () => {
    const r = await POST(
      postReq({ contentType: "application/json", body: { email: "a@b.c", t: "bad" } }),
    );
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toMatch(/Invalid unsubscribe/i);
  });

  it("POST valid JSON token mutates and returns JSON success", async () => {
    const r = await POST(
      postReq({ contentType: "application/json", body: { email: "Foo@B.C", t: "valid-token" } }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(deletes).toContain("foo@b.c");
  });

  it("POST form data with valid token applies unsubscribe", async () => {
    const r = await POST(
      postReq({ contentType: "application/x-www-form-urlencoded", form: { email: "a@b.c", t: "valid-token" } }),
    );
    expect(r.status).toBe(200);
    expect(deletes).toContain("a@b.c");
  });
});
