import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Booking } from "@/lib/bookings";
import type { DepositOffer } from "@/lib/booking-risk";

/** Mirrors the deposit-offer routes in app/routers/bookings.py (S6-05 Scenario 3). */

/** The owner accepting, on condition the deposit doubles. */
export function offerHigherDeposit(bookingId: string) {
  return backendRequest<DepositOffer>(
    `/bookings/${encodeURIComponent(bookingId)}/deposit-offer`,
    { method: "POST" },
  );
}

/** The renter agreeing: the extra is held and the booking is confirmed. */
export function acceptHigherDeposit(bookingId: string) {
  return backendRequest<Booking>(
    `/bookings/${encodeURIComponent(bookingId)}/deposit-offer/accept`,
    { method: "POST" },
  );
}

/** The renter turning it down, which withdraws their request. */
export function declineHigherDeposit(bookingId: string) {
  return backendRequest<Booking>(
    `/bookings/${encodeURIComponent(bookingId)}/deposit-offer/decline`,
    { method: "POST" },
  );
}
