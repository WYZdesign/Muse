import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export function getServiceClient() {
  const url = process.env.SUPABASE_URL || supabaseUrl;
  const key = process.env.SUPABASE_SECRET_KEY || "";
  return createClient(url, key, { auth: { persistSession: false } });
}
