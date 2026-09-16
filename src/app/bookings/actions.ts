"use server";

import { revalidatePath } from "next/cache";
import { createBooking, updateBookingStatus } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";
import type { Booking, BookingStatus } from "@/lib/bookings";

export type BookingActionResult = { error: string } | { booking: Booking };

async function run(action: () => Promise<Booking>): Promise<BookingActionResult> {
  try {
    const booking = await action();
    revalidatePath("/profile");
    revalidatePath("/listings/mine");
    revalidatePath(`/listings/${booking.listing_id}`);
    return { booking };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function requestBooking(listingId: string, startDate: string, endDate: string) {
  return run(() => createBooking(listingId, startDate, endDate));
}

export async function changeBookingStatus(bookingId: string, nextStatus: BookingStatus) {
  return run(() => updateBookingStatus(bookingId, nextStatus));
}
