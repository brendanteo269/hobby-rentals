import "server-only";

import { getListingLimits } from "@/lib/api/listings";
import { getProfileAvailability } from "@/lib/api/profile-availability";
import { isLocationArea, type LocationArea } from "@/lib/listings";
import { getOwnProfile } from "@/lib/profile";

/**
 * The owner-level defaults the listing form needs, loaded the same way for
 * create and edit so the two pages cannot drift on what "default" means.
 */
export async function getListingFormContext(): Promise<{
  profileAvailableDays: number[];
  profileDefaultLocation: LocationArea | null;
  depositCapBps: number;
}> {
  const [{ available_days: profileAvailableDays }, profile, { deposit_cap_bps: depositCapBps }] =
    await Promise.all([getProfileAvailability(), getOwnProfile(), getListingLimits()]);

  // The stored value is a plain text column, so a guard rather than a cast:
  // a future free-text migration on profiles should not start pre-filling
  // listings with strings the LocationArea select cannot represent.
  const profileDefaultLocation: LocationArea | null =
    profile?.default_pickup_location && isLocationArea(profile.default_pickup_location)
      ? profile.default_pickup_location
      : null;

  return { profileAvailableDays, profileDefaultLocation, depositCapBps };
}
