import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRate: async () => true, checkRateUser: async () => true, clientIp: () => "10.0.0.1" }));
vi.mock("@/lib/request-safety", () => ({ sanitizeText: (s: string, n: number) => String(s).slice(0, n) }));

type Row = Record<string, any>;
type FailMode = "none" | "storage" | "enqueue";

const state = {
  albums: null as Row | null,
  photos: null as Row | Row[] | null,
  deletes: [] as { table: string; filters: Record<string, unknown> }[],
  storageRemoves: [] as { bucket: string; paths: string[] }[],
  cleanupUpserts: [] as Row[],
  failMode: "none" as FailMode,
  storageRemoveError: null as { message: string } | null,
  cleanupUpsertError: null as { message: string } | null,
};

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => (globalThis as any).__sbMock,
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

import {
  albumAddPhoto,
  albumCreate,
  albumDelete,
  albumRemovePhoto,
  albumUpdate,
  albumView,
  albumLike,
  albumGrantAccess,
  parseOwnedAlbumStorageLocator,
} from "@/lib/muse-actions/albums";

function matches(row: Row, filters: Record<string, unknown>): boolean {
  return Object.entries(filters).every(([k, v]) => String(row[k]) === String(v));
}

function makeQuery(table: string) {
  const filters: Record<string, unknown> = {};
  let mode: "row" | "list" | "delete" | "upsert" = "row";
  const payload: { value?: Row } = {};

  const tableData = (): Row | Row[] | null => {
    if (table === "muse_albums") return state.albums;
    if (table === "muse_album_photos") return state.photos;
    return null;
  };

  const resolveNow = async () => {
    if (table === "muse_storage_cleanup_jobs") {
      if (state.failMode === "enqueue") {
        state.cleanupUpserts.push(payload.value || {});
        return { data: null, error: state.cleanupUpsertError || { message: "enqueue failed" } };
      }
      if (state.cleanupUpsertError) {
        state.cleanupUpserts.push(payload.value || {});
        return { data: null, error: state.cleanupUpsertError };
      }
      state.cleanupUpserts.push(payload.value || {});
      return { data: payload.value || {}, error: null };
    }
    if (mode === "delete") {
      state.deletes.push({ table, filters: { ...filters } });
      return { data: null, error: null };
    }
    const data = tableData();
    // Array seed: filter by eq() predicates (photo lists, etc.)
    if (Array.isArray(data)) {
      return { data: data.filter((row) => matches(row, filters)), error: null };
    }
    // Single-row seed: fixture IS the row for this table in the test —
    // do not require the seed to embed every eq() key (e.g. album id).
    if (data && typeof data === "object") {
      return { data, error: null };
    }
    return { data: null, error: null };
  };

  const q: any = {
    select(_cols?: unknown) { return q; },
    eq(col: string, val: unknown) { filters[col] = val; return q; },
    in: () => q,
    limit: () => q,
    or: () => q,
    delete() { mode = "delete"; return q; },
    upsert(v: Row) { mode = "upsert"; payload.value = v; return q; },
    insert(v: Row) { payload.value = v; return q; },
    update(_v: Row) { return q; },
    maybeSingle: async () => {
      const res = await resolveNow();
      return { data: res.data, error: res.error };
    },
    single: async () => {
      const res = await resolveNow();
      return { data: res.data, error: res.error };
    },
    then: (resolve: any, reject: any) => resolveNow().then(resolve, reject),
  };
  return q;
}

function installSbMock() {
  (globalThis as any).__sbMock = {
    from: (table: string) => makeQuery(table),
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          state.storageRemoves.push({ bucket, paths });
          if (state.failMode === "storage" || state.storageRemoveError) {
            return { data: null, error: state.storageRemoveError || { message: "storage remove failed" } };
          }
          return { data: paths, error: null };
        },
        createSignedUrl: async () => ({ data: { signedUrl: "https://signed.test/x" }, error: null }),
        upload: async () => ({ data: { path: "x" }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "https://pub.test/x" } }),
      }),
    },
  };
}

function ctx(
  rest: any,
  overrides: { album?: Row | null; photos?: Row[] | null; photo?: Row | null } = {},
) {
  installSbMock();
  if ("album" in overrides) state.albums = overrides.album ?? null;
  if ("photos" in overrides) state.photos = overrides.photos ?? null;
  if ("photo" in overrides) state.photos = overrides.photo ?? null;
  return {
    sb: (globalThis as any).__sbMock,
    profile: { id: "owner1" },
    rest,
    ip: "10.0.0.1",
    req: {} as any,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.albums = null;
  state.photos = null;
  state.deletes = [];
  state.storageRemoves = [];
  state.cleanupUpserts = [];
  state.failMode = "none";
  state.storageRemoveError = null;
  state.cleanupUpsertError = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  installSbMock();
});

describe("albums actions (ownership gate)", () => {
  it("albumUpdate rejects a non-owner (403)", async () => {
    const r = await albumUpdate(ctx({ albumId: "a1" }, { album: { profile_id: "someone-else", cover_url: "", access_level: "public" } }));
    expect((r as Response).status).toBe(403);
  });

  it("albumUpdate allows the owner (200)", async () => {
    const r = await albumUpdate(ctx({ albumId: "a1", title: "New" }, { album: { profile_id: "owner1", cover_url: "", access_level: "public" } }));
    expect((r as Response).status).toBe(200);
  });

  it("albumDelete rejects a non-owner (403)", async () => {
    const r = await albumDelete(ctx({ albumId: "a1" }, { album: { profile_id: "someone-else", cover_url: "" } }));
    expect((r as Response).status).toBe(403);
  });

  it("albumDelete requires albumId (400)", async () => {
    const r = await albumDelete(ctx({}, { album: null }));
    expect((r as Response).status).toBe(400);
  });

  it("albumCreate rejects a public cover for a private album", async () => {
    const r = await albumCreate(ctx({ title: "Private work", access_level: "private", cover_url: "https://cdn.example.test/public.jpg" }, { album: null }));
    expect((r as Response).status).toBe(400);
  });

  it("albumAddPhoto rejects a public locator for an invite-only album", async () => {
    const r = await albumAddPhoto(ctx({ albumId: "a1", img_url: "https://cdn.example.test/public.jpg" }, { album: { profile_id: "owner1", access_level: "invite" } }));
    expect((r as Response).status).toBe(400);
  });

  it("albumAddPhoto rejects another owner's private locator", async () => {
    const r = await albumAddPhoto(ctx({ albumId: "a1", img_url: "storage://muse-private/someone-else/album/photo.jpg" }, { album: { profile_id: "owner1", access_level: "private" } }));
    expect((r as Response).status).toBe(400);
  });

  it("albumGrantAccess requires albumId + viewerProfileId (400)", async () => {
    const r = await albumGrantAccess(ctx({ albumId: "a1" }, { album: { profile_id: "owner1" } }));
    expect((r as Response).status).toBe(400);
  });

  it("albumView returns 404 when album not found", async () => {
    const r = await albumView(ctx({ albumId: "a1" }, { album: null }));
    expect((r as Response).status).toBe(404);
  });

  it("albumView allows an owner to view their private album", async () => {
    const r = await albumView(ctx({ albumId: "a1" }, { album: { profile_id: "owner1", access_level: "private", view_count: 0 } }));
    expect((r as Response).status).toBe(200);
  });

  it("albumLike returns 404 when album not found", async () => {
    const r = await albumLike(ctx({ albumId: "a1" }, { album: null }));
    expect((r as Response).status).toBe(404);
  });
});

describe("parseOwnedAlbumStorageLocator", () => {
  const host = "abc.supabase.co";

  it("accepts owned private locator", () => {
    expect(parseOwnedAlbumStorageLocator("storage://muse-private/owner1/album/a.jpg", "owner1", host)).toEqual({
      bucket: "muse-private",
      path: "owner1/album/a.jpg",
    });
  });

  it("rejects foreign private locator", () => {
    expect(parseOwnedAlbumStorageLocator("storage://muse-private/other/album/a.jpg", "owner1", host)).toBeNull();
  });

  it("rejects traversal in private path", () => {
    expect(parseOwnedAlbumStorageLocator("storage://muse-private/owner1/../secret.jpg", "owner1", host)).toBeNull();
  });

  it("rejects malformed / non-muse values", () => {
    expect(parseOwnedAlbumStorageLocator("", "owner1", host)).toBeNull();
    expect(parseOwnedAlbumStorageLocator(null, "owner1", host)).toBeNull();
    expect(parseOwnedAlbumStorageLocator("https://evil.test/muse-uploads/owner1/a.jpg", "owner1", host)).toBeNull();
    expect(parseOwnedAlbumStorageLocator("https://abc.supabase.co/storage/v1/object/public/muse-uploads/other/a.jpg", "owner1", host)).toBeNull();
  });

  it("accepts owned public-bucket object URL", () => {
    expect(
      parseOwnedAlbumStorageLocator(
        "https://abc.supabase.co/storage/v1/object/public/muse-uploads/owner1/album/a.jpg",
        "owner1",
        host,
      ),
    ).toEqual({ bucket: "muse-uploads", path: "owner1/album/a.jpg" });
  });
});

describe("album private storage deletion lifecycle", () => {
  it("albumDelete removes owned private cover + photo objects from muse-private", async () => {
    const r = await albumDelete(ctx(
      { albumId: "a1" },
      {
        album: { profile_id: "owner1", cover_url: "storage://muse-private/owner1/album/cover.jpg" },
        photos: [
          { album_id: "a1", img_url: "storage://muse-private/owner1/album/p1.jpg" },
          { album_id: "a1", img_url: "storage://muse-private/owner1/album/p2.jpg" },
        ],
      },
    ));
    expect((r as Response).status).toBe(200);
    expect(state.deletes.some((d) => d.table === "muse_albums")).toBe(true);
    expect(state.storageRemoves).toHaveLength(1);
    expect(state.storageRemoves[0].bucket).toBe("muse-private");
    expect([...state.storageRemoves[0].paths].sort()).toEqual([
      "owner1/album/cover.jpg",
      "owner1/album/p1.jpg",
      "owner1/album/p2.jpg",
    ]);
    expect(state.cleanupUpserts).toHaveLength(0);
    const body = await (r as Response).json();
    expect(body).toMatchObject({ success: true, pendingCleanup: 0, cleanedStorage: 3 });
  });

  it("albumDelete rejects wrong-owner without touching storage", async () => {
    const r = await albumDelete(ctx(
      { albumId: "a1" },
      { album: { profile_id: "someone-else", cover_url: "storage://muse-private/someone-else/album/cover.jpg" } },
    ));
    expect((r as Response).status).toBe(403);
    expect(state.storageRemoves).toHaveLength(0);
    expect(state.deletes.filter((d) => d.table === "muse_albums" && d.filters.id === "a1")).toHaveLength(0);
  });

  it("albumDelete ignores foreign/malformed locators (no arbitrary path delete)", async () => {
    const r = await albumDelete(ctx(
      { albumId: "a1" },
      {
        album: { profile_id: "owner1", cover_url: "storage://muse-private/other/album/evil.jpg" },
        photos: [{ album_id: "a1", img_url: "https://cdn.example.test/not-muse.jpg" }],
      },
    ));
    expect((r as Response).status).toBe(200);
    expect(state.storageRemoves).toHaveLength(0);
    expect(state.cleanupUpserts).toHaveLength(0);
  });

  it("albumDelete selects private bucket, not muse-uploads, for private locators", async () => {
    await albumDelete(ctx(
      { albumId: "a1" },
      {
        album: { profile_id: "owner1", cover_url: "" },
        photos: [{ album_id: "a1", img_url: "storage://muse-private/owner1/album/p.jpg" }],
      },
    ));
    expect(state.storageRemoves[0]?.bucket).toBe("muse-private");
    expect(state.storageRemoves.every((r) => r.bucket === "muse-uploads")).toBe(false);
  });

  it("albumDelete records a durable cleanup job when storage remove fails after DB delete", async () => {
    state.failMode = "storage";
    const r = await albumDelete(ctx(
      { albumId: "a1" },
      {
        album: { profile_id: "owner1", cover_url: "storage://muse-private/owner1/album/cover.jpg" },
        photos: [{ album_id: "a1" }],
      },
    ));
    expect((r as Response).status).toBe(200);
    expect(state.deletes.some((d) => d.table === "muse_albums")).toBe(true);
    expect(state.storageRemoves).toHaveLength(1);
    expect(state.cleanupUpserts).toHaveLength(1);
    expect(state.cleanupUpserts[0]).toMatchObject({
      bucket: "muse-private",
      path: "owner1/album/cover.jpg",
      reason: "album_delete",
      profile_id: "owner1",
      status: "pending",
    });
    const body = await (r as Response).json();
    expect(body).toMatchObject({ success: true, pendingCleanup: 1 });
  });

  it("albumDelete returns 500 when DB delete succeeds but durable enqueue fails", async () => {
    state.failMode = "storage";
    state.cleanupUpsertError = { message: "no table" };
    const r = await albumDelete(ctx(
      { albumId: "a1" },
      {
        album: { profile_id: "owner1", cover_url: "storage://muse-private/owner1/album/cover.jpg" },
        photos: [{ album_id: "a1" }],
      },
    ));
    expect((r as Response).status).toBe(500);
    const body = await (r as Response).json();
    expect(body.code).toBe("STORAGE_CLEANUP_UNRECORDED");
    expect(state.deletes.some((d) => d.table === "muse_albums")).toBe(true);
  });

  it("albumDelete is idempotent when the album row is already gone", async () => {
    const r = await albumDelete(ctx({ albumId: "missing" }, { album: null }));
    expect((r as Response).status).toBe(200);
    const body = await (r as Response).json();
    expect(body).toMatchObject({ success: true, alreadyDeleted: true });
    expect(state.storageRemoves).toHaveLength(0);
    expect(state.deletes.some((d) => d.table === "muse_albums")).toBe(false);
  });

  it("albumRemovePhoto deletes owned private object after DB row delete", async () => {
    const r = await albumRemovePhoto(ctx(
      { photoId: "p1" },
      {
        photo: {
          id: "p1",
          album_id: "a1",
          img_url: "storage://muse-private/owner1/album/p1.jpg",
        },
        album: { profile_id: "owner1" },
      },
    ));
    expect((r as Response).status).toBe(200);
    expect(state.deletes.some((d) => d.table === "muse_album_photos")).toBe(true);
    expect(state.storageRemoves).toEqual([
      { bucket: "muse-private", paths: ["owner1/album/p1.jpg"] },
    ]);
    expect(state.cleanupUpserts).toHaveLength(0);
  });

  it("albumRemovePhoto rejects wrong-owner without storage delete", async () => {
    const r = await albumRemovePhoto(ctx(
      { photoId: "p1" },
      {
        photo: { id: "p1", album_id: "a1", img_url: "storage://muse-private/someone-else/album/p1.jpg" },
        album: { profile_id: "someone-else" },
      },
    ));
    expect((r as Response).status).toBe(403);
    expect(state.storageRemoves).toHaveLength(0);
  });

  it("albumRemovePhoto rejects foreign locator on owned photo (no arbitrary path)", async () => {
    const r = await albumRemovePhoto(ctx(
      { photoId: "p1" },
      {
        photo: { id: "p1", album_id: "a1", img_url: "storage://muse-private/other/album/p1.jpg" },
        album: { profile_id: "owner1" },
      },
    ));
    expect((r as Response).status).toBe(200);
    expect(state.storageRemoves).toHaveLength(0);
  });

  it("albumRemovePhoto records durable cleanup job on storage failure", async () => {
    state.failMode = "storage";
    const r = await albumRemovePhoto(ctx(
      { photoId: "p1" },
      {
        photo: { id: "p1", album_id: "a1", img_url: "storage://muse-private/owner1/album/p1.jpg" },
        album: { profile_id: "owner1" },
      },
    ));
    expect((r as Response).status).toBe(200);
    expect(state.cleanupUpserts[0]).toMatchObject({
      bucket: "muse-private",
      path: "owner1/album/p1.jpg",
      reason: "remove_photo",
      photo_id: "p1",
      status: "pending",
    });
  });

  it("albumRemovePhoto is idempotent when the photo row is already gone", async () => {
    const r = await albumRemovePhoto(ctx({ photoId: "missing" }, { photo: null, album: null }));
    expect((r as Response).status).toBe(200);
    const body = await (r as Response).json();
    expect(body).toMatchObject({ success: true, alreadyDeleted: true });
    expect(state.storageRemoves).toHaveLength(0);
  });

  it("albumRemovePhoto uses muse-uploads for owned public-bucket URLs", async () => {
    await albumRemovePhoto(ctx(
      { photoId: "p1" },
      {
        photo: {
          id: "p1",
          album_id: "a1",
          img_url: "https://abc.supabase.co/storage/v1/object/public/muse-uploads/owner1/album/p1.jpg",
        },
        album: { profile_id: "owner1" },
      },
    ));
    expect(state.storageRemoves).toEqual([
      { bucket: "muse-uploads", paths: ["owner1/album/p1.jpg"] },
    ]);
  });
});
