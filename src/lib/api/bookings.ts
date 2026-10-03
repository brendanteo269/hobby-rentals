import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Booking, BookingStatus } from "@/lib/bookings";

export function createBooking(listing_id: string, start_date: string, end_date: string, idempotency_key: string) {
  return backendRequest<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify({ listing_id, start_date, end_date, idempotency_key }),
  });
}

export type BookingQuote = {
  rental_days: number;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  lines: {
    count: number;
    unit: "day" | "week";
    rate_cents: number;
    amount_cents: number;
    capped_from_days?: number | null;
  }[];
  rental_subtotal_cents: number;
  platform_fee_bps: number;
  platform_fee_cents: number;
  deposit_cents: number;
  total_amount_cents: number;
};

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
