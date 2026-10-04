import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Booking, BookingQuote, BookingStatus } from "@/lib/bookings";

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
