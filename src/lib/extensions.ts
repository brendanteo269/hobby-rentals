import type { Booking, BookingStatus } from "@/lib/bookings";

/**
 * S3-17: rental extension requests.
 *
 * Shapes only - no "server-only" here, because the renter's request dialog and
 * the owner's decision buttons are both client components that read them.
 */

export type ExtensionStatus = "PENDING" | "APPROVED" | "DENIED";

/**
 * What extra days would add to a booking's held amounts.
 *
 * Every figure is a delta on what the booking already holds, never a price for
 * a standalone rental - which is why there is no deposit line: one rental of
 * one item holds one deposit however long it runs.
 */
export type ExtensionQuote = {
  additional_days: number;
  previous_end_date: string;
  new_end_date: string;
  rental_subtotal_delta_cents: number;
  platform_fee_delta_cents: number;
  protection_fee_delta_cents: number;
  total_delta_cents: number;
};

/** A submitted request: its quote, plus who asked and where it stands. */
export type ExtensionRequest = ExtensionQuote & {
  id: string;
  booking_id: string;
  requested_by: string;
  status: ExtensionStatus;
  decided_by?: string | null;
  decided_at?: string | null;
  created_at: string;
};

/**
 * "An active, ongoing rental" (Scenario 1). A confirmed booking that has not
 * started yet is changed by cancelling and re-booking; there is nothing in
 * hand to keep for longer. Mirrors EXTENDABLE_BOOKING_STATUSES in
 * app/extension_service.py - the server refuses anything else regardless.
 */
export const EXTENDABLE_BOOKING_STATUSES: BookingStatus[] = ["ACTIVE"];

/**
 * Whether this renter can ask to keep the item longer, and has not already asked.
 *
 * Bundle components are not considered: they never reach either party's
 * booking list, which is read from endpoints that exclude them.
 */
export function canRequestExtension(booking: Pick<Booking, "status" | "pending_extension">): boolean {
  return EXTENDABLE_BOOKING_STATUSES.includes(booking.status) && !booking.pending_extension;
}

/** The charge breakdown an extension dialog shows, skipping lines that cost nothing. */
export function extensionLines(quote: ExtensionQuote): { label: string; cents: number; tone?: "total" }[] {
  return [
    { label: `${quote.additional_days} extra ${quote.additional_days === 1 ? "day" : "days"}`, cents: quote.rental_subtotal_delta_cents },
    { label: "Platform fee", cents: quote.platform_fee_delta_cents },
    ...(quote.protection_fee_delta_cents > 0
      ? [{ label: "Damage protection", cents: quote.protection_fee_delta_cents }]
      : []),
    { label: "Total to hold", cents: quote.total_delta_cents, tone: "total" as const },
  ];
}
