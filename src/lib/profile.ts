import { createClient } from "@/lib/supabase/server";

/**
 * Application data for a user, mirroring public.profiles.
 *
 * Email is intentionally absent — it lives on the auth session, so read it
 * from there rather than duplicating it here.
 */
export type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Reads the signed-in user's profile.
 *
 * Row Level Security scopes this to the caller, so no user id is passed in —
 * an anonymous caller simply gets nothing back. Returns null when the row is
 * missing, which is the expected state only if the signup trigger failed.
 */
export async function getOwnProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at, updated_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile:", error.message);
    return null;
  }
  return data;
}
