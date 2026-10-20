"use server";

import { revalidatePath } from "next/cache";
import { acceptDamageClaim } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";
import type { ClaimSettlement } from "@/lib/settlement";

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
