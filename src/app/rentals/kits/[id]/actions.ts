"use server";

import { revalidatePath } from "next/cache";
import { KitApiError, withdrawKit } from "@/lib/api/booking-groups";
import { renterKitPath } from "@/lib/routes";

export type WithdrawKitResult = { error: string } | { withdrawn: true };

/** S5-09: withdraws a bundle no owner has accepted any of yet, releasing every hold. */
export async function withdrawKitAction(kitId: string): Promise<WithdrawKitResult> {
  try {
    await withdrawKit(kitId);
    revalidatePath(renterKitPath(kitId));
    revalidatePath("/rentals/bookings");
    // The layout too: withdrawing notifies the renter, so the unread count moves.
    revalidatePath("/", "layout");
    return { withdrawn: true };
  } catch (error) {
    if (error instanceof KitApiError) return { error: error.message };
    throw error;
  }
}
