import "server-only";

import { backendRequest } from "@/lib/api/client";
import type {
  Booking,
  BookingQuote,
  BookingRequestDetail,
  BookingRequestSummary,
  BookingStatus,
  DeclineReason,
} from "@/lib/bookings";
import type { CancellationPreview, CancellationRecord } from "@/lib/cancellations";

// Re-exported so existing callers keep importing the quote from here.
export type { BookingQuote } from "@/lib/bookings";

export function createBooking(
  listing_id: string,
  start_date: string,
  end_date: string,
  idempotency_key: string,
  damage_protection = false,
) {
  return backendRequest<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify({ listing_id, start_date, end_date, idempotency_key, damage_protection }),
  });
}

export function getBookingQuote(
  listingId: string,
  startDate: string,
  endDate: string,
  damageProtection = false,
) {
  const query = new URLSearchParams({
    listing_id: listingId,
    start_date: startDate,
    end_date: endDate,
    damage_protection: String(damageProtection),
  });
  return backendRequest<BookingQuote>(`/bookings/quote?${query.toString()}`);
}

export function getMyBookings() {
  return backendRequest<Booking[]>("/bookings/mine");
}

export function getOwnerBookings() {
  return backendRequest<Booking[]>("/bookings/owner");
}

/** The owner's unanswered requests, the one about to lapse first. */
export function getOwnerBookingRequests() {
  return backendRequest<BookingRequestSummary[]>("/bookings/owner/requests");
}

/** One of the owner's requests, for review. 404 for anyone else's. */
export function getOwnerBookingRequest(bookingId: string) {
  return backendRequest<BookingRequestDetail>(`/bookings/owner/requests/${encodeURIComponent(bookingId)}`);
}

/** One of the owner's bundle requests, for review. 404 for anyone else's. */
export function getOwnerBundleRequest(bundleBookingId: string) {
  return backendRequest<BookingRequestDetail>(
    `/bookings/owner/requests/bundles/${encodeURIComponent(bundleBookingId)}`,
  );
}

/** The owner declines a request, saying why; the renter's hold is released. */
export function declineBooking(bookingId: string, reason: DeclineReason, note: string | null) {
  return backendRequest<Booking>(`/bookings/${encodeURIComponent(bookingId)}/decline`, {
    method: "POST",
    body: JSON.stringify({ reason, note }),
  });
}

export function updateBookingStatus(bookingId: string, nextStatus: BookingStatus) {
  return backendRequest<Booking>(`/bookings/${encodeURIComponent(bookingId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: nextStatus }),
  });
}

/** What cancelling the renter's booking now would refund under the policy; changes nothing. */
export function getBookingCancellationPreview(bookingId: string) {
  return backendRequest<CancellationPreview>(`/bookings/${encodeURIComponent(bookingId)}/cancellation`);
}

/**
 * The renter cancels their pending or confirmed booking. `expected_refund_cents`
 * is the refund they were shown: if the tier has moved on since, the backend
 * refuses with QUOTE_CHANGED rather than pay a different amount.
 */
export function cancelBooking(bookingId: string, idempotency_key: string, expected_refund_cents: number) {
  return backendRequest<Booking & { cancellation: CancellationRecord }>(
    `/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { method: "POST", body: JSON.stringify({ idempotency_key, expected_refund_cents }) },
  );
}
