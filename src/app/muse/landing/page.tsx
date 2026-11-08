/** Server entry for /muse/landing.
 *
 * Seeds the social-proof "creatives joined" count into the initial HTML so
 * crawlers, share-preview bots and no-JS users see the real number instead of
 * 0. The client component still refreshes it after hydration. Count source is
 * the same one /api/muse/landing-stats uses (muse_profiles). Revalidated every
 * 60s so this stays on the static/ISR path rather than per-request SSR.
 */
import LandingClient from "./landing-client";
import { getServiceClient } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demo-mode";

export const revalidate = 60;

async function getSignupCount(): Promise<number> {
  try {
    if (isDemoMode()) return 0;
    const { count } = await getServiceClient()
      .from("muse_profiles")
      .select("*", { count: "exact", head: true });
    return count || 0;
  } catch {
    // Never fail the landing page over a count. The client fetch retries.
    return 0;
  }
}

export default async function Page() {
  const initialSignupCount = await getSignupCount();
  return <LandingClient initialSignupCount={initialSignupCount} />;
}
