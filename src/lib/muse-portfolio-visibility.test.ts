import { describe, it, expect } from "vitest";
import { createSb, tableCalls } from "@/test-support/sb";
import {
  DEFAULT_PORTFOLIO_VISIBILITY,
  PORTFOLIO_VISIBILITY_KEY,
  albumAccessEquivalent,
  areMutuallyMatched,
  getProfilePortfolioVisibility,
  normalizePortfolioVisibility,
  portfolioVisibilityFromPreferences,
  resolvePortfolioGate,
} from "@/lib/muse-portfolio-visibility";

const OWNER = "11111111-1111-4111-8111-111111111111";
const VIEWER = "22222222-2222-4222-8222-222222222222";

describe("normalizePortfolioVisibility", () => {
  it("passes through the three canonical values", () => {
    expect(normalizePortfolioVisibility("everyone")).toBe("everyone");
    expect(normalizePortfolioVisibility("matches")).toBe("matches");
    expect(normalizePortfolioVisibility("private")).toBe("private");
  });
  it("collapses absent / unknown values to the default", () => {
    expect(normalizePortfolioVisibility(undefined)).toBe(DEFAULT_PORTFOLIO_VISIBILITY);
    expect(normalizePortfolioVisibility(null)).toBe("everyone");
    expect(normalizePortfolioVisibility("invite")).toBe("everyone");
    expect(normalizePortfolioVisibility(42)).toBe("everyone");
  });
});

describe("portfolioVisibilityFromPreferences", () => {
  it("reads the key off an object blob", () => {
    expect(portfolioVisibilityFromPreferences({ [PORTFOLIO_VISIBILITY_KEY]: "private" })).toBe("private");
    expect(portfolioVisibilityFromPreferences({ [PORTFOLIO_VISIBILITY_KEY]: "matches" })).toBe("matches");
  });
  it("defaults for null / non-object / missing key", () => {
    expect(portfolioVisibilityFromPreferences(null)).toBe("everyone");
    expect(portfolioVisibilityFromPreferences("private")).toBe("everyone");
    expect(portfolioVisibilityFromPreferences({ nsfw: true })).toBe("everyone");
  });
});

describe("albumAccessEquivalent", () => {
  it("maps the client vocabulary onto muse_albums.access_level", () => {
    expect(albumAccessEquivalent("everyone")).toBe("public");
    expect(albumAccessEquivalent("matches")).toBe("invite");
    expect(albumAccessEquivalent("private")).toBe("private");
  });
});

describe("getProfilePortfolioVisibility", () => {
  it("returns the stored preference", async () => {
    const sb = createSb((table) =>
      table === "muse_profiles" ? { data: { preferences: { portfolioVisibility: "matches" } } } : { data: null },
    );
    expect(await getProfilePortfolioVisibility(sb as any, OWNER)).toBe("matches");
  });
  it("defaults to everyone when the row is missing", async () => {
    const sb = createSb(() => ({ data: null }));
    expect(await getProfilePortfolioVisibility(sb as any, OWNER)).toBe("everyone");
  });
});

describe("areMutuallyMatched", () => {
  it("is false without both ids (and does not query)", async () => {
    const sb = createSb(() => ({ data: [] }));
    expect(await areMutuallyMatched(sb as any, "", OWNER)).toBe(false);
    expect(await areMutuallyMatched(sb as any, VIEWER, "")).toBe(false);
    expect(await areMutuallyMatched(sb as any, OWNER, OWNER)).toBe(false);
    expect(tableCalls(sb.__log, "muse_matches")).toHaveLength(0);
  });
  it("is true only when both directions exist", async () => {
    const both = createSb(() => ({
      data: [
        { user_id: VIEWER, target_id: OWNER },
        { user_id: OWNER, target_id: VIEWER },
      ],
    }));
    expect(await areMutuallyMatched(both as any, VIEWER, OWNER)).toBe(true);
  });
  it("is false for a one-directional like", async () => {
    const oneWay = createSb(() => ({ data: [{ user_id: VIEWER, target_id: OWNER }] }));
    expect(await areMutuallyMatched(oneWay as any, VIEWER, OWNER)).toBe(false);
  });
  it("is false when the query returns no data", async () => {
    const none = createSb(() => ({ data: null }));
    expect(await areMutuallyMatched(none as any, VIEWER, OWNER)).toBe(false);
  });
});

describe("resolvePortfolioGate", () => {
  it("always allows the owner and does not read their preferences", async () => {
    const sb = createSb(() => ({ data: { preferences: { portfolioVisibility: "private" } } }));
    expect(await resolvePortfolioGate(sb as any, OWNER, OWNER)).toEqual({ allowed: true, visibility: "everyone" });
    expect(tableCalls(sb.__log, "muse_profiles")).toHaveLength(0);
  });
  it("allows any viewer when the portfolio is public", async () => {
    const sb = createSb(() => ({ data: { preferences: { portfolioVisibility: "everyone" } } }));
    expect(await resolvePortfolioGate(sb as any, OWNER, VIEWER)).toEqual({ allowed: true, visibility: "everyone" });
  });
  it("denies non-owners when the portfolio is private", async () => {
    const sb = createSb(() => ({ data: { preferences: { portfolioVisibility: "private" } } }));
    const gate = await resolvePortfolioGate(sb as any, OWNER, VIEWER);
    expect(gate.allowed).toBe(false);
    expect(gate.visibility).toBe("private");
    expect(tableCalls(sb.__log, "muse_matches")).toHaveLength(0);
  });
  it("allows a mutually matched viewer when visibility is matches", async () => {
    const sb = createSb((table) =>
      table === "muse_profiles"
        ? { data: { preferences: { portfolioVisibility: "matches" } } }
        : { data: [{ user_id: VIEWER, target_id: OWNER }, { user_id: OWNER, target_id: VIEWER }] },
    );
    expect((await resolvePortfolioGate(sb as any, OWNER, VIEWER)).allowed).toBe(true);
  });
  it("denies an unmatched viewer when visibility is matches", async () => {
    const sb = createSb((table) =>
      table === "muse_profiles"
        ? { data: { preferences: { portfolioVisibility: "matches" } } }
        : { data: [] },
    );
    expect((await resolvePortfolioGate(sb as any, OWNER, VIEWER)).allowed).toBe(false);
  });
  it("denies an unauthenticated viewer when visibility is matches", async () => {
    const sb = createSb(() => ({ data: { preferences: { portfolioVisibility: "matches" } } }));
    expect((await resolvePortfolioGate(sb as any, OWNER, null)).allowed).toBe(false);
  });
});
