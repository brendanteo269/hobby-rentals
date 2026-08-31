import { createClient } from "@/lib/supabase/server";

/**
 * Application data for a member, mirroring public.profiles.
 *
 * Email is intentionally absent — it lives on the auth session, so read it
 * from there rather than duplicating it here.
 */
export type Profile = {
  id: string;
  display_name: string | null;
  wants_to_rent: boolean;
  wants_to_own: boolean;
  /** Null until first-run setup is done. See the profile_intent migration. */
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

const PROFILE_COLUMNS =
  "id, display_name, wants_to_rent, wants_to_own, onboarded_at, created_at, updated_at";

/**
 * Reads the signed-in member's profile.
 *
 * Row Level Security scopes this to the caller, so no user id is passed in —
 * an anonymous caller simply gets nothing back. Returns null when the row is
 * missing, which is the expected state only if the signup trigger failed.
 */
export async function getOwnProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle();

  if (error) {
    console.error("Failed to load profile:", error.message);
    return null;
  }
  return data;
}
