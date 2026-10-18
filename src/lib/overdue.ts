import type { Booking } from "@/lib/bookings";

/**
 * S3-18: overdue return handling.
 *
 * Shapes and the small rules the UI needs. Overdue is a flag on a booking
 * that stays ACTIVE, not a status - see the header of
 * supabase/migrations/20261017090000_overdue_returns.sql for why - so there
 * is no "OVERDUE" in BookingStatus to check against.
 */

/** A rental that is late, or whose late fees its deposit did not cover. */
export type OverdueBooking = {
  id: string;
  listing_id: string;
  listing_name?: string | null;
  start_date: string;
  end_date: string;
  deposit_cents?: number | null;
  overdue_since?: string | null;
  overdue_daily_rate_cents?: number | null;
  overdue_fee_cents: number;
  overdue_arrears_cents: number;
};

/**
 * Whether this renter may book, and what it would take to lift a suspension.
 * `suspended` is derived from the debt by the backend, so it can never
 * disagree with what a booking attempt would actually be refused with.
 */
export type SuspensionStatus = {
  suspended: boolean;
  debt_cents: number;
  overdue_bookings: OverdueBooking[];
};

/** Whether this rental is past its return date and still out. */
export function isOverdue(booking: Pick<Booking, "overdue_since">): boolean {
  return Boolean(booking.overdue_since);
}

/** How many days late, counting the first late day as one. */
export function daysOverdue(booking: Pick<Booking, "overdue_since">, today = new Date()): number {
  if (!booking.overdue_since) return 0;
  const since = new Date(`${booking.overdue_since}T00:00:00`);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(Math.round((midnight.getTime() - since.getTime()) / 86_400_000) + 1, 0);
}

/**
 * The late fee a booking has run up, or null when there is nothing to show.
 *
 * Returns null rather than zero so callers can omit the line entirely: a
 * rental returned on time should say nothing about late fees at all.
 */
export function overdueFeeCents(
  booking: Pick<Booking, "overdue_since" | "overdue_fee_cents" | "overdue_arrears_cents">,
): number | null {
  const fee = booking.overdue_fee_cents ?? 0;
  return fee > 0 || booking.overdue_since ? fee : null;
}
