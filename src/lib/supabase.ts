import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _supabase;
}

// Lazy proxy — no client created until first property access
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
});

export function getServiceClient() {
  const url = process.env.SUPABASE_URL || supabaseUrl;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key, { auth: { persistSession: false } });
}

// A fresh, per-request client carrying the caller's own access token as its
// Authorization header. Needed for any supabase-js call that acts on the
// CURRENT SESSION rather than taking a token explicitly (auth.mfa.enroll/
// verify/challenge/unenroll/listFactors all work this way) — the shared
// `supabase` singleton above never has a server-side session set, so those
// calls were silently running as the anon key (no user `sub` claim) and
// failing with "invalid claim: missing sub claim". auth.getUser(token) is
// unaffected since it takes the token explicitly and doesn't need this.
export function getUserScopedClient(token: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
