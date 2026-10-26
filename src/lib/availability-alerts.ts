/**
 * S4-07: alerts on dates an owner has blocked out.
 *
 * The sibling of the S2-15 waitlist, for the other reason a date is refused.
 * A waitlist queues behind someone else's booking, so only one renter can be
 * served and a position matters; an alert watches a blackout, which nobody
 * holds, so every watcher is told at once and there is no queue.
 *
 * Shapes and rules only - no "server-only" here, because the panel that sets
 * and cancels alerts is a client component.
 */
import type { UnavailableDate } from "@/lib/listings";

export type AlertStatus = "ACTIVE" | "FULFILLED" | "CANCELLED";

export type AvailabilityAlert = {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  status: AlertStatus;
  /** The days that actually opened - may be only part of the watched range. */
  fulfilled_dates?: string[] | null;
  fulfilled_at?: string | null;
  created_at: string;
};

/** Days the owner has blocked, which are the only ones worth an alert. */
export function blockedDates(unavailable: UnavailableDate[]): Set<string> {
  return new Set(unavailable.filter((entry) => entry.reason === "BLACKOUT").map((entry) => entry.date));
}

/**
 * Whether every day from start to end is blocked by the owner.
 *
 * The API refuses an alert on dates that are merely bookable, so the panel
 * offers one only when there is actually something to wait for.
 */
export function rangeIsBlocked(start: string, end: string, blocked: Set<string>): boolean {
  if (!start || !end || end < start) return false;
  // Parsed and stepped in UTC throughout. Local midnight read back through
  // toISOString() lands on the previous day everywhere east of Greenwich,
  // which would silently shift every date in the range by one.
  for (const day = new Date(`${start}T00:00:00Z`); ; day.setUTCDate(day.getUTCDate() + 1)) {
    const iso = day.toISOString().slice(0, 10);
    if (!blocked.has(iso)) return false;
    if (iso >= end) return true;
  }
}

/** The alert covering exactly this range, if the renter already set one. */
export function activeAlertFor(
  alerts: AvailabilityAlert[],
  start: string,
  end: string,
): AvailabilityAlert | undefined {
  return alerts.find(
    (alert) => alert.status === "ACTIVE" && alert.start_date === start && alert.end_date === end,
  );
}
