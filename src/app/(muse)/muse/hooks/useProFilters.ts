/** Professional directory filter state and derivation for the Talent tab, extracted from NetworkScreen so the screen stays inside its size budget. */
"use client";

import { useMemo, useState } from "react";
import type { Professional } from "../components/types";
import { PROFESSIONALS } from "../components/types";
import type { ProExp, ProSort, ProRateBand } from "../components/NetworkProsTab";

export const parseYrs = (e: string) => parseInt(e, 10) || 0;
export const parseRate = (r?: string) => parseInt(String(r || "").replace(/[^0-9]/g, ""), 10) || 0;
export const expBand = (e: string): "rising" | "established" | "veteran" => {
  const y = parseYrs(e);
  return y >= 12 ? "veteran" : y >= 8 ? "established" : "rising";
};

export type UseProFiltersArgs = {
  liveProfessionals?: Professional[] | null;
  showNsfw: boolean;
  demo: boolean;
  /** Advanced filters (skills, experience, rate, sort, looking) are Musa Pro. */
  proFiltersLocked: boolean;
};

export function useProFilters({ liveProfessionals, showNsfw, demo, proFiltersLocked }: UseProFiltersArgs) {
  const [proExp, setProExp] = useState<ProExp>("all");
  const [proSort, setProSort] = useState<ProSort>("match");
  const [proHiringOnly, setProHiringOnly] = useState(false);
  const [proSearch, setProSearch] = useState("");
  const [proSkill, setProSkill] = useState<string[]>([]);
  const [proRateBand, setProRateBand] = useState<ProRateBand>("all");
  const [proLooking, setProLooking] = useState<string>("all");
  const [proSearchServer, setProSearchServer] = useState("");
  const [proServerResults, setProServerResults] = useState<Professional[]>([]);

  const proList = (() => {
    // If server search has results, use those
    if (proSearchServer.trim().length >= 2 && proServerResults.length > 0) {
      return proServerResults.filter((p) => showNsfw || !p.nsfw);
    }
    let list: Professional[] = (liveProfessionals?.length ? liveProfessionals : (demo ? PROFESSIONALS : [])).filter((p) => showNsfw || !p.nsfw);
    if (!proFiltersLocked && proExp !== "all") list = list.filter((p) => expBand(p.exp) === proExp);
    if (proHiringOnly) list = list.filter((p) => p.openings > 0);
    const q = proSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.skills.some((s: string) => s.toLowerCase().includes(q)) ||
          (p.looking || []).some((l: string) => l.toLowerCase().includes(q))
      );
    }
    if (!proFiltersLocked && proSkill.length) list = list.filter((p) => proSkill.every((s) => p.skills.includes(s)));
    if (!proFiltersLocked && proRateBand !== "all") {
      list = list.filter((p) => {
        const r = parseRate(p.rate);
        if (proRateBand === "tfp") return /tfp/i.test(String(p.rate || ""));
        if (proRateBand === "50to100") return r >= 50 && r < 100;
        if (proRateBand === "100to150") return r >= 100 && r <= 150;
        return r > 150;
      });
    }
    if (!proFiltersLocked && proLooking !== "all") list = list.filter((p) => (p.looking || []).some((l: string) => l === proLooking));
    const arr = [...list];
    if (proFiltersLocked) return arr;
    if (proSort === "expDesc") arr.sort((a, b) => parseYrs(b.exp) - parseYrs(a.exp));
    else if (proSort === "expAsc") arr.sort((a, b) => parseYrs(a.exp) - parseYrs(b.exp));
    else if (proSort === "rateDesc") arr.sort((a, b) => parseRate(b.rate) - parseRate(a.rate));
    else if (proSort === "rateAsc") arr.sort((a, b) => parseRate(a.rate) - parseRate(b.rate));
    else if (proSort === "openings") arr.sort((a, b) => b.openings - a.openings);
    return arr;
  })();

  const { allSkills, allLooking } = useMemo(() => {
    const proSource = liveProfessionals?.length ? liveProfessionals : PROFESSIONALS;
    return {
      allSkills: [...new Set(proSource.flatMap((p) => p.skills))],
      allLooking: [...new Set(proSource.flatMap((p) => p.looking || []))],
    };
  }, [liveProfessionals]);

  return {
    proExp, setProExp,
    proSort, setProSort,
    proHiringOnly, setProHiringOnly,
    proSearch, setProSearch,
    proSkill, setProSkill,
    proRateBand, setProRateBand,
    proLooking, setProLooking,
    proSearchServer, setProSearchServer,
    proServerResults, setProServerResults,
    proList,
    allSkills, allLooking,
  };
}
