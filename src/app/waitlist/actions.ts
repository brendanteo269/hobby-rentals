"use server";

import { revalidatePath } from "next/cache";
import { joinWaitlist, leaveWaitlist, WaitlistApiError } from "@/lib/api/waitlist";
import type { WaitlistEntry } from "@/lib/waitlist";

/**
 * S2-15: joining and leaving a queue for dates somebody else holds.
 *
 * Joining holds no funds, so unlike the booking actions there is no
 * idempotency key: a double-submit is refused by the database's one-open-
 * entry-per-range index rather than needing to be deduplicated.
 */
export type WaitlistActionResult = { error: string } | { entry: WaitlistEntry };

async function run(action: () => Promise<WaitlistEntry>): Promise<WaitlistActionResult> {
  try {
    const entry = await action();
    revalidatePath("/profile");
    revalidatePath(`/listings/${entry.listing_id}`);
    return { entry };
  } catch (error) {
    if (error instanceof WaitlistApiError) return { error: error.message };
    throw error;
  }
}

export async function joinListingWaitlist(listingId: string, startDate: string, endDate: string) {
  return run(() => joinWaitlist(listingId, startDate, endDate));
}

export async function leaveListingWaitlist(entryId: string) {
  return run(() => leaveWaitlist(entryId));
}
