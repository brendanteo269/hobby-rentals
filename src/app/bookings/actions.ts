"use server";

import { revalidatePath } from "next/cache";
import { createBooking, getBookingQuote, updateBookingStatus } from "@/lib/api/bookings";
import {
  createBundleBooking,
  getBundleQuote,
  updateBundleBookingStatus,
} from "@/lib/api/bundles";
import { BackendApiError } from "@/lib/api/client";
import type { Booking, BookingQuote, BookingStatus } from "@/lib/bookings";
import type { BundleBooking, BundleQuote } from "@/lib/bundles";

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
    revalidatePath("/profile");
    revalidatePath("/listings/mine");
    revalidatePath(`/bundles/${booking.bundle_id}`);
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
