"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { recordAdminAction } from "@/lib/audit";
import { deactivateListing, getListingById, reactivateListing } from "@/lib/listings";
import { ROUTES } from "@/lib/routes";

export type ListingModerationState = { error?: string; success?: string } | undefined;

/**
 * S2-23 Scenario 1: deactivates an active or archived listing with a
 * mandatory reason, removing it from public discovery and notifying the
 * owner. The status change, the lifecycle record, and the owner's
 * notification all happen inside deactivateListing's single UPDATE (via the
 * database trigger) - this just validates, calls it, and records the
 * administrator's own audit trail entry.
 */
export async function deactivateListingAction(
  _prev: ListingModerationState,
  formData: FormData,
): Promise<ListingModerationState> {
  await requirePortalSession();
  const listingId = String(formData.get("listing_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) return { error: "A reason is required to deactivate a listing." };

  const listing = await getListingById(listingId);
  if (!listing) return { error: "That listing no longer exists." };

  const { error } = await deactivateListing(listingId, reason);
  if (error) return { error };

  await recordAdminAction("listing_deactivated", listing.owner_id, { listing_id: listingId, reason });

  revalidatePath(ROUTES.listing(listingId));
  return { success: `${listing.name} has been deactivated and the owner notified.` };
}

/**
 * S2-23 Scenario 2: restores a deactivated listing to Published. No reason
 * is captured for a reactivation - the story only requires one for taking a
 * listing down, not for putting it back.
 */
export async function reactivateListingAction(
  _prev: ListingModerationState,
  formData: FormData,
): Promise<ListingModerationState> {
  await requirePortalSession();
  const listingId = String(formData.get("listing_id") ?? "");

  const listing = await getListingById(listingId);
  if (!listing) return { error: "That listing no longer exists." };

  const { error } = await reactivateListing(listingId);
  if (error) return { error };

  await recordAdminAction("listing_reactivated", listing.owner_id, { listing_id: listingId });

  revalidatePath(ROUTES.listing(listingId));
  return { success: `${listing.name} has been reactivated and is visible to renters again.` };
}
