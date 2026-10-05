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

// Re-exported so existing callers keep importing the quote from here.
export type { BookingQuote } from "@/lib/bookings";

export function createBooking(listing_id: string, start_date: string, end_date: string, idempotency_key: string) {
  return backendRequest<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify({ listing_id, start_date, end_date, idempotency_key }),
  });
}

export function getBookingQuote(listingId: string, startDate: string, endDate: string) {
  const query = new URLSearchParams({ listing_id: listingId, start_date: startDate, end_date: endDate });
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

/** The renter withdraws their own pending request, releasing its hold. */
export function withdrawBooking(bookingId: string) {
  return backendRequest<Booking>(`/bookings/${encodeURIComponent(bookingId)}/withdraw`, { method: "POST" });
}
