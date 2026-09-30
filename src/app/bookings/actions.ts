"use server";

import { revalidatePath } from "next/cache";
import { createBooking, getBookingQuote, updateBookingStatus, type BookingQuote } from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";
import type { Booking, BookingStatus } from "@/lib/bookings";

export type BookingActionResult =
  | { error: string; code?: string; shortfallCents?: number }
  | { booking: Booking };

export type BookingQuoteResult = { error: string } | { quote: BookingQuote };

async function run(action: () => Promise<Booking>): Promise<BookingActionResult> {
  try {
    const booking = await action();
    revalidatePath("/profile");
    revalidatePath("/listings/mine");
    revalidatePath(`/listings/${booking.listing_id}`);
    return { booking };
  } catch (error) {
    if (error instanceof BackendApiError) {
      return { error: error.message, code: error.code, shortfallCents: error.shortfallCents };
    }
    throw error;
  }
}

export async function quoteBooking(listingId: string, startDate: string, endDate: string): Promise<BookingQuoteResult> {
  try {
    return { quote: await getBookingQuote(listingId, startDate, endDate) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function requestBooking(listingId: string, startDate: string, endDate: string, idempotencyKey: string) {
  return run(() => createBooking(listingId, startDate, endDate, idempotencyKey));
}

export async function changeBookingStatus(bookingId: string, nextStatus: BookingStatus) {
  return run(() => updateBookingStatus(bookingId, nextStatus));
}
