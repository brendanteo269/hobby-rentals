import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv, supabaseSecretKey } from "@/lib/env";

/**
 * Supabase client holding the secret key. It bypasses Row Level Security and
 * can reach the Auth admin endpoints, so it answers to nobody.
 *
 * Two rules, both load-bearing:
 *
 *  1. Call it only after requireAdmin() has established who is asking. This
 *     client has no session and no notion of a caller, so every guard that
 *     normally lives in the database is absent here.
 *  2. Never return one of its results straight to the browser without
 *     deciding what the browser is allowed to see. RLS is not going to
 *     catch a mistake on this path.
 *
 * Sessions are switched off because there is no user to persist — treating
 * this as a signed-in client would let a stray call write the service token
 * into the cookie store.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();

  return createSupabaseClient(url, supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
