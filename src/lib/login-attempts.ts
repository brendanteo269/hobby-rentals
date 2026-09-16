/**
 * The per-account login rate limit, as seen from the application.
 *
 * All the policy — how many failures, how long a lockout lasts — lives in the
 * login_attempts migration, so this module only translates between that and
 * the login form. Keeping the numbers in SQL means they cannot drift from the
 * counter that enforces them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Rounds a lockout up to whole minutes, so nobody is told "try again in 1s". */
function describeWait(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "a minute" : `${minutes} minutes`;
}

/**
 * The message to show instead of attempting a sign-in, or null when the address
 * may proceed.
 *
 * A failure to reach the database returns null — the member is let through to a
 * normal credential check. The alternative, failing closed, would turn a
 * database blip into a total login outage, and an attacker who can take the
 * database down has already achieved more than bypassing a counter.
 */
export async function lockoutMessage(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("login_lockout_seconds", { p_email: email });

  if (error) {
    console.error("Login lockout check failed:", error.message);
    return null;
  }

  const seconds = Number(data);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  return `Too many failed attempts. Try again in ${describeWait(seconds)}.`;
}

/** Counts one failed sign-in against the address. */
export async function recordFailedLogin(supabase: SupabaseClient, email: string): Promise<void> {
  const { error } = await supabase.rpc("record_failed_login", { p_email: email });
  // Best effort: a member who has just failed to log in should see "wrong
  // password", not an error about the counter that was meant to be invisible.
  if (error) console.error("Recording failed login failed:", error.message);
}

/**
 * Clears the counter after a successful sign-in.
 *
 * Must be called with a client that already holds the new session — the
 * function identifies the account from the caller's token, not from an
 * argument. Calling it before signInWithPassword would clear nothing.
 */
export async function clearLoginAttempts(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("clear_login_attempts");
  if (error) console.error("Clearing login attempts failed:", error.message);
}
