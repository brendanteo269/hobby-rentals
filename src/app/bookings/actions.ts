"use server";

import { revalidatePath } from "next/cache";
import {
  createBooking,
  declineBooking,
  getBookingQuote,
  updateBookingStatus,
  withdrawBooking,
} from "@/lib/api/bookings";
import {
  createBundleBooking,
  declineBundleBooking,
  getBundleQuote,
  updateBundleBookingStatus,
} from "@/lib/api/bundles";
import { BackendApiError } from "@/lib/api/client";
import type { Booking, BookingQuote, BookingStatus, DeclineReason } from "@/lib/bookings";
import type { BundleBooking, BundleQuote } from "@/lib/bundles";

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

export async function quoteBooking(
  listingId: string,
  startDate: string,
  endDate: string,
  damageProtection = false,
): Promise<BookingQuoteResult> {
  try {
    return { quote: await getBookingQuote(listingId, startDate, endDate, damageProtection) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function requestBooking(
  listingId: string,
  startDate: string,
  endDate: string,
  idempotencyKey: string,
  damageProtection = false,
) {
  return run(() => createBooking(listingId, startDate, endDate, idempotencyKey, damageProtection));
}

export async function changeBookingStatus(bookingId: string, nextStatus: BookingStatus) {
  return run(() => updateBookingStatus(bookingId, nextStatus));
}

export async function declineRequest(bookingId: string, reason: DeclineReason, note: string | null) {
  return run(() => declineBooking(bookingId, reason, note));
}


/**
 * Booking a bundle, which is the same flow as booking a listing: quote the
 * dates, then request them with a key that makes a retry safe.
 *
 * These live beside the single-listing actions rather than with the owner's
 * bundle actions, because this is the renter's half of the marketplace and
 * the two booking flows should be read together.
 */
export type BundleBookingActionResult =
  | { error: string; code?: string; shortfallCents?: number }
  | { booking: BundleBooking };

export type BundleQuoteResult = { error: string } | { quote: BundleQuote };

async function runBundle(action: () => Promise<BundleBooking>): Promise<BundleBookingActionResult> {
  try {
    const booking = await action();
    // The layout too: every bundle booking change notifies the renter, so
    // the header's unread count moves with it.
    revalidatePath("/", "layout");
    return { booking };
  } catch (error) {
    if (error instanceof BackendApiError) {
      return { error: error.message, code: error.code, shortfallCents: error.shortfallCents };
    }
    throw error;
  }
}

export async function quoteBundleBooking(
  bundleId: string,
  startDate: string,
  endDate: string,
): Promise<BundleQuoteResult> {
  try {
    return { quote: await getBundleQuote(bundleId, startDate, endDate) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function requestBundleBooking(
  bundleId: string,
  startDate: string,
  endDate: string,
  idempotencyKey: string,
) {
  return runBundle(() => createBundleBooking(bundleId, startDate, endDate, idempotencyKey));
}

export async function changeBundleBookingStatus(bundleBookingId: string, nextStatus: BookingStatus) {
  return runBundle(() => updateBundleBookingStatus(bundleBookingId, nextStatus));
}

export async function declineBundleRequest(bundleBookingId: string, reason: DeclineReason, note: string | null) {
  return runBundle(() => declineBundleBooking(bundleBookingId, reason, note));
}

export async function withdrawRequest(bookingId: string) {
  return run(() => withdrawBooking(bookingId));
}
