"use server";

import { revalidatePath } from "next/cache";
import {
  cancelBooking,
  createBooking,
  declineBooking,
  getBookingCancellationPreview,
  getBookingQuote,
  getRepairEstimate,
  submitDamageClaim,
  updateBookingStatus,
} from "@/lib/api/bookings";
import {
  cancelBundleBooking,
  createBundleBooking,
  declineBundleBooking,
  getBundleCancellationPreview,
  getBundleQuote,
  reportBundleDamage,
  updateBundleBookingStatus,
} from "@/lib/api/bundles";
import {
  approveExtension,
  denyExtension,
  getExtensionQuote,
  requestExtension,
} from "@/lib/api/extensions";
import { BackendApiError } from "@/lib/api/client";
import type { Booking, BookingQuote, BookingStatus, DeclineReason } from "@/lib/bookings";
import type { BundleBooking, BundleQuote } from "@/lib/bundles";
import type { CancellableKind, CancellationPreview, CancellationRecord } from "@/lib/cancellations";
import type { ExtensionQuote, ExtensionRequest } from "@/lib/extensions";
import type { RentalDispute, RepairEstimate } from "@/lib/settlement";

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


/**
 * S3-17: rental extensions.
 *
 * The renter prices one, then submits it; the owner approves or denies. Only
 * the owner's decision revalidates, because it is the only one that moves
 * money and dates - a submitted request leaves the booking exactly as it was,
 * and its dialog stays up to confirm what was asked.
 */
export type ExtensionQuoteResult = { error: string } | { quote: ExtensionQuote };
export type ExtensionRequestResult = { error: string } | { request: ExtensionRequest };

async function runExtension<T>(action: () => Promise<T>): Promise<{ error: string } | { value: T }> {
  try {
    return { value: await action() };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function quoteExtension(bookingId: string, additionalDays: number): Promise<ExtensionQuoteResult> {
  const result = await runExtension(() => getExtensionQuote(bookingId, additionalDays));
  return "error" in result ? result : { quote: result.value };
}

export async function submitExtensionRequest(
  bookingId: string,
  additionalDays: number,
): Promise<ExtensionRequestResult> {
  const result = await runExtension(() => requestExtension(bookingId, additionalDays));
  return "error" in result ? result : { request: result.value };
}

/** Approving moves the booking's end date and holds the extra amount. */
export async function approveExtensionRequest(requestId: string): Promise<BookingActionResult> {
  return run(() => approveExtension(requestId));
}

export async function denyExtensionRequest(requestId: string): Promise<ExtensionRequestResult> {
  const result = await runExtension(() => denyExtension(requestId));
  if ("error" in result) return result;
  // The renter is notified, so the header's unread count moves.
  revalidatePath("/", "layout");
  return { request: result.value };
}


export type ReportDamageResult = { error: string } | { dispute: RentalDispute };

/**
 * S3-10: the owner reports damage to one item of a returned bundle; listingId
 * names it. The bundle's money stays held until an admin decides. A single
 * booking is claimed with submitClaim instead, so its renter can respond.
 */
export async function reportBundleDamageAction(
  bundleBookingId: string,
  listingId: string,
  description: string,
  claimedCents: number,
): Promise<ReportDamageResult> {
  try {
    const dispute = await reportBundleDamage(bundleBookingId, listingId, description, claimedCents);
    revalidatePath("/", "layout");
    return { dispute };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}


/**
 * S3-06: the owner's damage claim on a returned booking, with the evidence
 * photos already uploaded (presign kind "claim"). The deposit stays held and
 * the renter is asked to respond.
 */
export async function submitClaim(
  bookingId: string,
  description: string,
  claimedCents: number,
  evidencePhotoKeys: string[],
  repairQuoteKeys: string[] = [],
): Promise<ReportDamageResult> {
  try {
    const dispute = await submitDamageClaim(bookingId, description, claimedCents, evidencePhotoKeys, repairQuoteKeys);
    revalidatePath("/", "layout");
    return { dispute };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}


/**
 * S4-08: the AI repair-cost estimate for the claim form. Called from the form
 * after it renders, because the first estimate searches the web and can take
 * up to a minute. An error is Scenario 9: the owner enters the amount.
 */
export async function loadRepairEstimate(bookingId: string): Promise<{ estimate: RepairEstimate } | { error: string }> {
  try {
    return { estimate: await getRepairEstimate(bookingId) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
