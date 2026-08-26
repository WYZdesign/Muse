"use client";

import { useState, useEffect } from "react";
import { trackError } from "@/lib/errorTracker";
import { normalizeBrief } from "./normalizers";

export type UseBriefsDataArgs = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  profileId: string | null;
};

export function useBriefsData({ authFetch, profileId }: UseBriefsDataArgs) {
  const [liveBriefs, setLiveBriefs] = useState<any[] | null>(null);

  // ═══ BRIEFS: fetch real briefs from API ═══
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    authFetch("/api/muse?type=briefs")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.briefs) setLiveBriefs(d.briefs.map(normalizeBrief)); })
      .catch((err) => { trackError("fetch_briefs", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [profileId]);

  return {
    liveBriefs, setLiveBriefs,
  };
}
