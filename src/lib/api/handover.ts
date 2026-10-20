import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { HandoverConfirmation } from "@/lib/handover";

/** Mirrors the handover route in app/routers/bookings.py. */

/**
 * S3-02: the caller - renter or owner - confirms the item changed hands. The
 * second confirmation starts the rental. 409 with code PICKUP_PHOTOS_REQUIRED,
 * NOT_CONFIRMED or TOO_EARLY when it is not allowed yet.
 */
export function confirmBookingHandover(bookingId: string) {
  return backendRequest<HandoverConfirmation>(`/bookings/${encodeURIComponent(bookingId)}/handover-confirmation`, {
    method: "POST",
  });
}
