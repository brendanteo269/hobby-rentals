import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Booking, BookingStatus } from "@/lib/bookings";

export function createBooking(listing_id: string, start_date: string, end_date: string) {
  return backendRequest<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify({ listing_id, start_date, end_date }),
  });
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
