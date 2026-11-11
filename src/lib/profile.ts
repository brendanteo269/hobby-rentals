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
  /** E.164 once verified; a member onboarded before verification may have free text here. */
  contact_number: string | null;
  /** When contact_number was proven by a texted code. See verifiedContactNumber. */
  contact_number_verified_at: string | null;
  /** Where they hand gear over as an owner. Null when they do not own. */
  default_pickup_location: string | null;
  bio: string | null;
  wants_to_rent: boolean;
  wants_to_own: boolean;
  /** Null until first-run setup is done. See the profile_intent migration. */
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

const PROFILE_COLUMNS =
  "id, display_name, contact_number, contact_number_verified_at, default_pickup_location, bio, wants_to_rent, wants_to_own, onboarded_at, created_at, updated_at";

/**
 * Reads the signed-in member's profile.
 *
 * Filtered explicitly by the caller's id rather than relying solely on RLS:
 * an admin's "read every profile" policy means an unfiltered select returns
 * every row for that account, not just its own. Returns null when the row is
 * missing (no session, or the signup trigger failed) or when there is none.
 */
export async function getOwnProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile:", error.message);
    return null;
  }
  return data;
}

/**
 * The member's contact number when it has been verified, else null. A number
 * typed before verification existed stays in contact_number, so reading that
 * column alone would treat it as proven.
 */
export function verifiedContactNumber(
  profile: Pick<Profile, "contact_number" | "contact_number_verified_at">,
): string | null {
  return profile.contact_number_verified_at ? profile.contact_number : null;
}
