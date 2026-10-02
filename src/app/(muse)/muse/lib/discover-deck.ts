import { PROFILES, CITY_GEO, calcMatch, matchReasons, type Profile } from "../components/types";
import { DEMO_MODE } from "../page-constants";
import { distanceMiles } from "@/app/muse-realtime";
import type { OnboardingData } from "../hooks/useAuthOnboardingState";

/**
 * P2 extraction: the Discover swipe-deck builder, moved verbatim out of page.tsx
 * (the ~70-line `filteredProfiles` useMemo). Pure function — the shuffle seed is
 * passed in so the per-mount randomness stays a page.tsx concern.
 */
export type DiscoveryProfile = Profile & {
  lat?: number;
  lng?: number;
  distanceMi?: number;
  matchScore?: number;
  showDistance?: boolean;
  matchReasons?: ReturnType<typeof matchReasons>;
};

export type DiscoverDeckInput = {
  seed: number;
  liveProfiles: DiscoveryProfile[] | null;
  showNsfw: boolean;
  filterStyles: string[];
  filterScore: number;
  myGeo: { lat: number; long: number } | null;
  discoverSearch: string;
  obData: OnboardingData;
};

export function buildFilteredProfiles({ seed, liveProfiles, showNsfw, filterStyles, filterScore, myGeo, discoverSearch, obData }: DiscoverDeckInput): DiscoveryProfile[] {
    // Stable order guarantee: the demo/static deck is shuffled ONCE with a
    // per-mount random seed, then live profiles are APPENDED (never reshuffled),
    // and we do NOT re-sort by distance after first paint. A new seed on every
    // full page load/refresh means a different card shows first each time,
    // while the order stays fixed during a single session (no mid-view jumps).
    const mulberry = (a: number) => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const base = [...PROFILES];
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(mulberry(seed + i) * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    // Audit fix (2026-09-08): liveProfiles come back from /api/muse?type=discover-ranked
    // pre-sorted server-side — boosted + complementary-side first, then by match
    // score (see get.ts) — specifically so a paid boost gets someone seen sooner.
    // This used to APPEND liveProfiles after the entire shuffled demo deck, which
    // silently discarded that ranking: a boosted real user could never appear
    // before dozens of unranked demo cards. Now real, ranked profiles lead (in
    // the order the server already computed — never re-sorted here), with the
    // shuffled demo deck filling in after. Demo-deck order among itself is still
    // untouched, so it doesn't jump mid-session.
    // Gating the static demo deck behind DEMO_MODE: in production this deck of
    // hardcoded creatives (ARCANA/AUDREY/CHER…) never leaks — the swipe deck is
    // pure live `discover-ranked` data, so nobody swipes fabricated people.
    const liveProfileList = (liveProfiles || []) as DiscoveryProfile[];
    const merged: DiscoveryProfile[] = DEMO_MODE && liveProfileList.length
      ? [...liveProfileList, ...base.filter((dp) => !liveProfileList.some((lp) => String(lp.id) === String(dp.id)))]
      : liveProfileList.length
        ? liveProfileList
        : (DEMO_MODE ? base : []);
    let list = showNsfw ? merged : merged.filter(p => !p.nsfw);
    if (filterStyles.length > 0) list = list.filter(p => p.styles.some((s: string) => filterStyles.includes(s)));
    if (filterScore > 50) list = list.filter(p => p.score >= filterScore);
    if (discoverSearch.trim()) {
      const q = discoverSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q) || p.loc?.toLowerCase().includes(q) || p.styles?.some((s: string) => s.toLowerCase().includes(q)));
    }
    const enriched = list.map(p => {
      const geo = CITY_GEO[p.loc];
      // Static demo profiles have no showDistance flag (default true); live
      // profiles carry the target's own privacy preference from /api/muse/match —
      // don't compute/attach a distance figure for someone who opted out.
      const targetAllowsDistance = p.showDistance !== false;
      const distMi = myGeo && geo && targetAllowsDistance ? distanceMiles(myGeo, geo) : null;
      const boosted: DiscoveryProfile = geo ? { ...p, lat: geo.lat, lng: geo.long } : { ...p };
      if (distMi !== null) boosted.distanceMi = distMi;
      // Recompute live match % from the user's current type/looking (the duality
      // change). calcMatch is source-of-truth; static seed score is a floor only
      // when the user hasn't set a type yet.
      try {
        const meForMatch = { type: obData.type || "", styles: obData.styles || [], looking: obData.looking || [], zodiac: obData.zodiac, chinese: obData.chinese, mbti: obData.mbti, lifePath: obData.lifePath };
        const liveScore = calcMatch(meForMatch, p);
        if (obData.type) boosted.score = Math.min(99, Math.max(boosted.score, liveScore));
        boosted.matchReasons = matchReasons(meForMatch, p);
      } catch { console.debug("[muse] match explanation could not be calculated"); }
      if (boosted.badges?.length) {
        const badgeBoost = boosted.badges.reduce((acc: number, b: { name: string }) => {
          if (b.name === "Verified Pro") return acc + 5;
          if (b.name === "Top Creator" || b.name === "Creative Sage") return acc + 3;
          if (b.name === "Super Collab") return acc + 4;
          if (b.name === "Quick Responder" || b.name === "Match Magnet") return acc + 2;
          if (b.name === "Style Icon" || b.name === "Local Legend") return acc + 1;
          return acc;
        }, 0);
        boosted.score = Math.min(99, boosted.score + badgeBoost);
      }
      return boosted;
    });
    return enriched;
}
