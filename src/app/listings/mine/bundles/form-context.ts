import "server-only";

import { getListingLimits, getMyListings } from "@/lib/api/listings";
import { getProfileAvailability } from "@/lib/api/profile-availability";
import type { SelectableListing } from "@/components/bundles/bundle-form";

/**
 * The owner-level defaults the bundle form needs, loaded the same way for
 * create and edit so the two pages cannot drift - the bundle counterpart of
 * getListingFormContext, and deliberately the same shape where they overlap.
 *
 * activeListings is filtered here rather than by the API: GET /listings/mine
 * is the owner's whole inventory, and every other page that reads it wants
 * all of it. A bundle may only contain ACTIVE listings (S2-20 Scenario 1
 * starts from "has multiple active listings").
 */
export async function getBundleFormContext(): Promise<{
  activeListings: SelectableListing[];
  profileAvailableDays: number[];
  depositCapBps: number;
}> {
  const [listings, { available_days: profileAvailableDays }, { deposit_cap_bps: depositCapBps }] =
    await Promise.all([getMyListings(), getProfileAvailability(), getListingLimits()]);

  return {
    activeListings: listings
      .filter((listing) => listing.status === "ACTIVE")
      .map(({ id, name, category, brand, price_per_day_cents, price_per_week_cents }) => ({
        id,
        name,
        category,
        brand,
        price_per_day_cents,
        price_per_week_cents,
      })),
    profileAvailableDays,
    depositCapBps,
  };
}
