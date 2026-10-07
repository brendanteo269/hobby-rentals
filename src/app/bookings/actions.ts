"use server";

import { revalidatePath } from "next/cache";
import {
  cancelBooking,
  createBooking,
  declineBooking,
  getBookingCancellationPreview,
  getBookingQuote,
  updateBookingStatus,
} from "@/lib/api/bookings";
import {
  cancelBundleBooking,
  createBundleBooking,
  declineBundleBooking,
  getBundleCancellationPreview,
  getBundleQuote,
  updateBundleBookingStatus,
} from "@/lib/api/bundles";
import { BackendApiError } from "@/lib/api/client";
import type { Booking, BookingQuote, BookingStatus, DeclineReason } from "@/lib/bookings";
import type { BundleBooking, BundleQuote } from "@/lib/bundles";
import type { CancellableKind, CancellationPreview, CancellationRecord } from "@/lib/cancellations";

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

/**
 * The renter cancelling - a single booking or a whole bundle booking, pending
 * or confirmed. Withdrawing a request is the same action: the policy refunds
 * a pending request in full.
 */
export type CancellationPreviewResult = { error: string } | { preview: CancellationPreview };

export type CancellationResult =
  | { cancellation: CancellationRecord }
  /** `preview` comes with QUOTE_CHANGED: the refund as it now stands. */
  | { error: string; code?: string; preview?: CancellationPreview };

export async function previewCancellation(kind: CancellableKind, id: string): Promise<CancellationPreviewResult> {
  try {
    const preview = kind === "bundle" ? await getBundleCancellationPreview(id) : await getBookingCancellationPreview(id);
    return { preview };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

/**
 * Not revalidated here: the dialog stays up to say what came back to the
 * wallet, and refreshes the page when the renter closes it. Revalidating now
 * would re-render the booking as cancelled and unmount the dialog mid-sentence.
 */
export async function cancelRental(
  kind: CancellableKind,
  id: string,
  idempotencyKey: string,
  expectedRefundCents: number,
): Promise<CancellationResult> {
  try {
    const result =
      kind === "bundle"
        ? await cancelBundleBooking(id, idempotencyKey, expectedRefundCents)
        : await cancelBooking(id, idempotencyKey, expectedRefundCents);
    return { cancellation: result.cancellation };
  } catch (error) {
    if (!(error instanceof BackendApiError)) throw error;
    if (error.code === "QUOTE_CHANGED") {
      const fresh = await previewCancellation(kind, id);
      return { error: error.message, code: error.code, preview: "preview" in fresh ? fresh.preview : undefined };
    }
    return { error: error.message, code: error.code };
  }
}
