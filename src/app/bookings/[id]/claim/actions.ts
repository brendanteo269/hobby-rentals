"use server";

import { revalidatePath } from "next/cache";
import { acceptDamageClaim, disputeDamageClaim } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";
import type { ClaimSettlement, RentalDispute } from "@/lib/settlement";

export type AcceptClaimResult = { error: string } | { settlement: ClaimSettlement };

/**
 * S3-07 Scenario 1: the renter accepts the owner's damage claim.
 *
 * Revalidates the layout as well as this page: accepting moves the deposit,
 * pays the owner and closes the claim, so the renter's bookings, their wallet
 * and the header's unread count have all changed.
 */
export async function acceptClaim(bookingId: string): Promise<AcceptClaimResult> {
  try {
    const settlement = await acceptDamageClaim(bookingId);
    revalidatePath("/", "layout");
    return { settlement };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}


export type DisputeClaimResult = { error: string } | { dispute: RentalDispute };

/**
 * S3-08 Scenarios 1 and 3: the renter rebuts the claim instead of accepting it.
 *
 * The deposit stays frozen either way - the dispute stays OPEN, which is what
 * settlement checks - so this changes who decides, not where the money sits.
 */
export async function disputeClaim(
  bookingId: string,
  rebuttal: string,
  photoKeys: string[],
): Promise<DisputeClaimResult> {
  try {
    const dispute = await disputeDamageClaim(bookingId, rebuttal, photoKeys);
    revalidatePath("/", "layout");
    return { dispute };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
