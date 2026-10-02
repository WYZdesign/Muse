import { describe, expect, it, vi } from "vitest";
import { buildPersistPayload, applyLoadedState, STORAGE_KEY, STATE_VERSION } from "./useMusePersistence";
import type { PersistValues, PersistSetters, LoadedState } from "./useMusePersistence";

/**
 * Parity tests for the P2 persistence extraction. The hook itself is a thin
 * wrapper; the risk lives in the field <-> setter mapping, so the pure
 * `buildPersistPayload` / `applyLoadedState` are tested directly.
 *
 * Fixtures are intentionally partial, so they are cast to the full shapes.
 */
const V = (o: unknown) => o as unknown as PersistValues;
const L = (o: unknown) => o as unknown as LoadedState;
const S = (o: unknown) => o as unknown as PersistSetters;

const SETTER_NAMES = [
  "setCurrentUser", "setObData", "setObStep", "setAuthUser", "setMatches",
  "setDailyLikes", "setSuperLikes", "setSavedBriefs", "setAppliedBriefs",
  "setSavedSessionIds", "setSavedProfileIds", "setUserBriefs", "setBlockedUsers",
  "setNotifPrefs", "setObConnectedSocials", "setShowNsfw", "setShowOnline",
  "setShowDistance", "setShowZodiac", "setShowAge", "setShowMbti", "setShowLifePath",
  "setShowChinese", "setShowMatchPercent", "setRsvpdEvents", "setForumPosts",
  "setFeedPosts", "setTestLevels", "setObSelects", "setObProfilePic",
  "setObPortfolioItems", "setLikedBy", "setProfileViews", "setProfileViewers",
  "setStories", "setTheme", "setActivityFeed", "setDiscoveryPrefs", "setChatImages",
  "setChatTarget", "setScreen", "setBoostActive", "setBoostEnd",
];

function makeSetters() {
  const s: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const n of SETTER_NAMES) s[n] = vi.fn();
  return s;
}

describe("useMusePersistence — buildPersistPayload", () => {
  const base = {
    currentUser: { id: "u1" }, obData: { a: 1 }, obStep: 3, matches: [] as any[],
    dailyLikes: 5, superLikes: 2, savedBriefs: ["b"], appliedBriefs: ["a"],
    savedSessionIds: ["s"], savedProfileIds: ["p"], userBriefs: [], blockedUsers: [],
    notifPrefs: { match: true }, obConnectedSocials: ["ig"], showNsfw: false,
    showOnline: true, showDistance: true, showZodiac: true, showAge: true,
    showMbti: true, showLifePath: true, showChinese: true, showMatchPercent: true,
    rsvpdEvents: [], forumPosts: [], feedPosts: [], testLevels: {}, obSelects: {},
    obProfilePic: "", obPortfolioItems: [], likedBy: [], profileViews: 9,
    profileViewers: [], stories: [], theme: "lasunset", activityFeed: [],
    discoveryPrefs: { ageMin: 18 }, chatImages: {}, screen: "discover",
    filterStyles: [], filterScore: 50, searchQuery: "x", connTab: "community",
    museCat: "all", authUser: { id: "u1" }, authRemember: true, chatTarget: null,
  };

  it("stamps the schema version", () => {
    expect(buildPersistPayload(V({ ...base })).v).toBe(STATE_VERSION);
    expect(STORAGE_KEY).toBe("muse_v1");
  });

  it("caps long lists to the last 50 items", () => {
    const matches = Array.from({ length: 80 }, (_, i) => ({ id: i }));
    const p = buildPersistPayload(V({ ...base, matches })) as { matches: { id: number }[] };
    expect(p.matches).toHaveLength(50);
    expect(p.matches[0].id).toBe(30);
    expect(p.matches[49].id).toBe(79);
  });

  it("drops authUser when remember-me is off", () => {
    expect(buildPersistPayload(V({ ...base, authRemember: false })).authUser).toBeNull();
    expect(buildPersistPayload(V({ ...base, authRemember: true })).authUser).toEqual({ id: "u1" });
  });

  it("trims chatImages threads to the last 20 messages", () => {
    const thread = Array.from({ length: 30 }, (_, i) => i);
    const p = buildPersistPayload(V({ ...base, chatImages: { c1: thread } })) as unknown as { chatImages: Record<string, number[]> };
    expect(p.chatImages.c1).toHaveLength(20);
    expect(p.chatImages.c1[0]).toBe(10);
  });
});

describe("useMusePersistence — applyLoadedState mapping (no cross-wiring)", () => {
  it("maps each show* field to its own setter", () => {
    const showFields = [
      "showNsfw", "showOnline", "showDistance", "showZodiac", "showAge",
      "showMbti", "showLifePath", "showChinese", "showMatchPercent",
    ];
    for (const field of showFields) {
      const setters = makeSetters();
      // Non-empty matches skips the DEMO seeding branch.
      applyLoadedState(L({ matches: [{ id: "m1" }], [field]: true }), S(setters));
      const expectedSetter = "set" + field[0].toUpperCase() + field.slice(1);
      expect(setters[expectedSetter], `${field} -> ${expectedSetter}`).toHaveBeenCalledWith(true);
      // every OTHER show* setter must be untouched
      for (const other of showFields) {
        if (other === field) continue;
        const otherSetter = "set" + other[0].toUpperCase() + other.slice(1);
        expect(setters[otherSetter], `${field} leaked into ${otherSetter}`).not.toHaveBeenCalled();
      }
    }
  });

  it("routes data fields to their matching setters by value", () => {
    const setters = makeSetters();
    applyLoadedState(L({
      matches: [{ id: "m1" }],
      obData: "OB", obStep: 3, authUser: "AU", dailyLikes: 5, superLikes: 2,
      savedBriefs: "SB", appliedBriefs: "AB", savedSessionIds: "SSI", savedProfileIds: "SPI",
      userBriefs: "UB", blockedUsers: "BU", notifPrefs: "NP", obConnectedSocials: "OCS",
      rsvpdEvents: "RE", forumPosts: "FP", feedPosts: "FeP", testLevels: "TL",
      obSelects: "OS", obProfilePic: "OPP", obPortfolioItems: "OPI", likedBy: "LB",
      stories: ["st"], theme: "nebula", activityFeed: "AF", discoveryPrefs: "DP",
      chatImages: "CI", chatTarget: "CT", screen: "discover",
    }), S(setters));

    expect(setters.setObData).toHaveBeenCalledWith("OB");
    expect(setters.setObStep).toHaveBeenCalledWith(3);
    expect(setters.setAuthUser).toHaveBeenCalledWith("AU");
    expect(setters.setDailyLikes).toHaveBeenCalledWith(5);
    expect(setters.setSuperLikes).toHaveBeenCalledWith(2);
    expect(setters.setSavedBriefs).toHaveBeenCalledWith("SB");
    expect(setters.setAppliedBriefs).toHaveBeenCalledWith("AB");
    expect(setters.setSavedSessionIds).toHaveBeenCalledWith("SSI");
    expect(setters.setSavedProfileIds).toHaveBeenCalledWith("SPI");
    expect(setters.setUserBriefs).toHaveBeenCalledWith("UB");
    expect(setters.setBlockedUsers).toHaveBeenCalledWith("BU");
    expect(setters.setNotifPrefs).toHaveBeenCalledWith("NP");
    expect(setters.setObConnectedSocials).toHaveBeenCalledWith("OCS");
    expect(setters.setRsvpdEvents).toHaveBeenCalledWith("RE");
    expect(setters.setForumPosts).toHaveBeenCalledWith("FP");
    expect(setters.setFeedPosts).toHaveBeenCalledWith("FeP");
    expect(setters.setTestLevels).toHaveBeenCalledWith("TL");
    expect(setters.setObSelects).toHaveBeenCalledWith("OS");
    expect(setters.setObProfilePic).toHaveBeenCalledWith("OPP");
    expect(setters.setObPortfolioItems).toHaveBeenCalledWith("OPI");
    expect(setters.setLikedBy).toHaveBeenCalledWith("LB");
    expect(setters.setStories).toHaveBeenCalledWith(["st"]);
    expect(setters.setTheme).toHaveBeenCalledWith("nebula");
    expect(setters.setActivityFeed).toHaveBeenCalledWith("AF");
    expect(setters.setDiscoveryPrefs).toHaveBeenCalledWith("DP");
    expect(setters.setChatImages).toHaveBeenCalledWith("CI");
    expect(setters.setChatTarget).toHaveBeenCalledWith("CT");
    expect(setters.setScreen).toHaveBeenCalledWith("discover");

    // and it did NOT mis-route a value to an unrelated setter
    expect(setters.setDailyLikes).not.toHaveBeenCalledWith(2);
    expect(setters.setSuperLikes).not.toHaveBeenCalledWith(5);
  });

  it("rejects an unknown theme instead of persisting it", () => {
    const setters = makeSetters();
    applyLoadedState(L({ matches: [{ id: "m" }], theme: "hacker-green" }), S(setters));
    expect(setters.setTheme).toHaveBeenCalledWith("lasunset");
  });

  it("falls back to matches when a persisted chat screen has no chatTarget", () => {
    const setters = makeSetters();
    applyLoadedState(L({ matches: [{ id: "m" }], screen: "chat" }), S(setters));
    expect(setters.setScreen).toHaveBeenCalledWith("matches");
  });
});
