"use server";

import { revalidatePath } from "next/cache";
import {
  createBooking,
  getBookingQuote,
  updateBookingStatus,
  withdrawBooking,
  type BookingQuote,
} from "@/lib/api/bookings";
import { BackendApiError } from "@/lib/api/client";
import type { Booking, BookingStatus } from "@/lib/bookings";

export type BookingActionResult =
  | { error: string; code?: string; shortfallCents?: number }
  | { booking: Booking };

export type BookingQuoteResult = { error: string } | { quote: BookingQuote };

async function run(action: () => Promise<Booking>): Promise<BookingActionResult> {
  try {
    const booking = await action();
    // The layout too: every booking change notifies the renter, so the
    // header's unread count moves with it.
    revalidatePath("/", "layout");
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

export async function withdrawRequest(bookingId: string) {
  return run(() => withdrawBooking(bookingId));
}
