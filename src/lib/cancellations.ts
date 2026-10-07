import type { BookingStatus } from "@/lib/bookings";

/**
 * A renter cancelling a booking or a whole bundle booking, and what that
 * pays back under the cancellation policy.
 *
 * The policy itself lives in the backend (cancellation_terms); the preview a
 * renter is shown and the cancellation that moves the money both come from
 * it, so nothing here decides an amount - this only describes one.
 */

/** Which policy tier a cancellation fell into. */
export type CancellationTier = "REQUEST_WITHDRAWN" | "FULL" | "PARTIAL" | "LATE";

/**
 * Why a booking cannot be cancelled: it has been handed over (the return
 * process settles it instead), it is one item of a bundle (cancel the
 * bundle), or it is already over.
 */
export type CancellationRefusal = "BOOKING_ACTIVE" | "BUNDLE_COMPONENT" | "NOT_CANCELLABLE";

export type CancellationTerms = {
  policy_version: string;
  tier: CancellationTier;
  tier_label: string | null;
  refund_bps: number;
  hours_before_start: number;
  /** Rental fee plus platform fee: the part the tier splits. */
  rental_hold_cents: number;
  refund_cents: number;
  non_refundable_cents: number;
  /** Always the whole security deposit. */
  deposit_release_cents: number;
  total_back_to_wallet_cents: number;
};

/** What cancelling now would mean; the terms are absent when it cannot be cancelled. */
export type CancellationPreview = Partial<CancellationTerms> & {
  booking_id: string | null;
  bundle_booking_id: string | null;
  cancellable: boolean;
  reason: CancellationRefusal | null;
  message: string | null;
  quoted_at?: string | null;
};

/** A cancellation as it was settled. */
export type CancellationRecord = CancellationTerms & {
  id: string;
  booking_id: string | null;
  bundle_booking_id: string | null;
  from_status: BookingStatus;
  /** The wallet's REFUND entry; null when nothing was refundable. */
  refund_transaction_id: string | null;
  cancelled_at: string;
};

export type CancellableKind = "booking" | "bundle";

/**
 * The statuses a renter is offered "Cancel" on. ACTIVE is included on
 * purpose: the backend refuses it, and the preview says to use the return
 * process instead, which is the answer a renter looking for the button needs.
 */
export const RENTER_CANCEL_OFFERED_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "ACTIVE"];

export function hasTerms(preview: CancellationPreview): preview is CancellationPreview & CancellationTerms {
  return preview.cancellable && typeof preview.refund_cents === "number";
}

export type CancellationLine = { label: string; cents: number; tone?: "loss" | "total" };

/**
 * The preview as the renter reads it, top to bottom: what was paid for the
 * rental, how it splits, the deposit, and what lands back in the wallet. A
 * line with nothing on it is left out rather than shown as $0.00, except the
 * total, which is the answer even when it is nothing.
 */
export function cancellationLines(terms: CancellationTerms): CancellationLine[] {
  const lines: CancellationLine[] = [
    { label: "Rental and platform fee held", cents: terms.rental_hold_cents },
    { label: `Refunded (${terms.refund_bps / 100}%)`, cents: terms.refund_cents },
    { label: "Not refundable", cents: terms.non_refundable_cents, tone: "loss" },
    { label: "Security deposit released", cents: terms.deposit_release_cents },
  ];
  return [
    ...lines.filter((line) => line.cents > 0),
    { label: "Back to your wallet", cents: terms.total_back_to_wallet_cents, tone: "total" },
  ];
}
