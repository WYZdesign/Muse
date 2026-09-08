// Free-text search filters for Collab briefs and Sessions listings (audit
// findings taskrabbit-p2-1 / thumbtack-p2-1). Pulled out of CollabScreen.tsx
// and SessionsScreen.tsx into a plain (non-JSX) module, both so the two
// screens share one matching rule instead of two hand-copies drifting apart,
// and so the matching logic itself is unit-testable without pulling
// React/next/image into a test — the same reasoning as sessionTiers.ts.

export function matchesBriefSearch(
  brief: { title?: string; desc?: string; author?: string; tags?: string[] },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (brief.title || "").toLowerCase().includes(q) ||
    (brief.desc || "").toLowerCase().includes(q) ||
    (brief.author || "").toLowerCase().includes(q) ||
    (brief.tags || []).some(t => t.toLowerCase().includes(q))
  );
}

export function matchesSessionSearch(
  session: { name?: string; type?: string; skills?: string[] },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (session.name || "").toLowerCase().includes(q) ||
    (session.type || "").toLowerCase().includes(q) ||
    (session.skills || []).some(sk => sk.toLowerCase().includes(q))
  );
}
