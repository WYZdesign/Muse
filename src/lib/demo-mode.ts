/**
 * Server-side source of truth for the public demo safety boundary.
 *
 * A browser-visible flag can control presentation, but it cannot be the only
 * protection against direct API calls. Defaulting to demo is intentional: an
 * operator must explicitly set MUSE_DEMO_MODE=false before any real external
 * money, identity, or OAuth workflow can be initiated.
 */
export function isDemoMode(): boolean {
  const serverValue = process.env.MUSE_DEMO_MODE;
  if (serverValue === "false") return false;
  if (serverValue === "true") return true;
  return process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

export function demoModeUnavailable(resource: string) {
  return { error: `${resource} is unavailable in demo mode`, code: "DEMO_MODE" };
}
