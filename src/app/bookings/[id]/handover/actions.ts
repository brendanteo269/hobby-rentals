"use server";

import { revalidatePath } from "next/cache";
import { BackendApiError } from "@/lib/api/client";
import { confirmBookingHandover } from "@/lib/api/handover";
import type { HandoverConfirmation } from "@/lib/handover";

export type ConfirmHandoverResult = { error: string; code?: string } | { confirmation: HandoverConfirmation };

/**
 * S3-02: the renter's or the owner's confirmation that the item changed
 * hands. Refused with code PICKUP_PHOTOS_REQUIRED until the pickup photos are
 * done, NOT_CONFIRMED while the booking is still pending, and TOO_EARLY
 * before the start date.
 */
export async function confirmHandover(bookingId: string): Promise<ConfirmHandoverResult> {
  try {
    const confirmation = await confirmBookingHandover(bookingId);
    revalidatePath("/profile");
    revalidatePath("/listings/mine/bookings");
    return { confirmation };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
