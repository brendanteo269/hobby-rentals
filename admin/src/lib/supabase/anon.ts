import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

/**
 * Sessionless client holding only the publishable key.
 *
 * Exists for one call: resending a member's confirmation email. That is an
 * ordinary public endpoint, so it needs no privilege — and deliberately must
 * not have any, because the secret-key client would send the request as the
 * service role and the member would receive a different email from the one
 * they got at signup.
 *
 * Sessions are switched off because there is no user here to persist.
 */
export function createAnonClient() {
  const { url, publishableKey } = supabaseEnv();

  return createSupabaseClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
