"use server";

import { revalidatePath } from "next/cache";
import { archiveListing, ListingApiError, removeListing, restoreListing } from "@/lib/api/listings";
import type { Listing } from "@/lib/listings";

export type ListingActionResult = { error: string } | { listing: Listing };

async function run(action: () => Promise<Listing>): Promise<ListingActionResult> {
  try {
    const listing = await action();
    revalidatePath("/listings/mine");
    return { listing };
  } catch (error) {
    if (error instanceof ListingApiError) return { error: error.message };
    throw error;
  }
}

export async function archiveMyListing(listingId: string): Promise<ListingActionResult> {
  return run(() => archiveListing(listingId));
}

export async function restoreMyListing(listingId: string): Promise<ListingActionResult> {
  return run(() => restoreListing(listingId));
}

/** S1-12 Scenario 2/3: confirmation happens client-side, before this runs. */
export async function removeMyListing(listingId: string): Promise<ListingActionResult> {
  return run(() => removeListing(listingId));
}
