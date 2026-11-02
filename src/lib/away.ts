import { formatDateRange, formatDayMonth, toIsoDate } from "@/lib/format";

/**
 * S5-15: Away mode, the owner's one-step pause of every listing and bundle.
 *
 * Owners see it called Away mode. Renters never do: they are told the item is
 * "not taking bookings", because saying publicly that an owner is away says
 * their home is empty. Every renter-facing string comes from here so that rule
 * lives in one place.
 */

/** Mirrors set_owner_away's limit; the backend refuses anything longer. */
export const AWAY_MAX_DAYS = 90;
export const AWAY_MESSAGE_MAX_LENGTH = 200;

/** The owner's current or upcoming period, as GET /profile/away returns it. */
export type AwayPeriod = { start_date: string; end_date: string; message: string | null };

/** A booking or request the period would land on. `id` is what a save acknowledges or declines. */
export type AwayClash = {
  id: string;
  kind: "LISTING" | "BUNDLE";
  item_name: string;
  renter_name: string | null;
  status: "PENDING" | "CONFIRMED" | "ACTIVE";
  start_date: string;
  end_date: string;
};

/** What renters are shown of a period: its dates and the owner's own words. */
export type BookingPause = AwayPeriod;

/** Under way, as opposed to scheduled. Both compare ISO dates as strings. */
export function hasStarted(period: Pick<AwayPeriod, "start_date">, today: string): boolean {
  return period.start_date <= today;
}

/** "Not taking bookings until 3 Jan" while it runs; the whole range before it starts. */
export function bookingPauseHeadline(pause: BookingPause, today: string): string {
  return hasStarted(pause, today)
    ? `Not taking bookings until ${formatDayMonth(pause.end_date)}`
    : `Not taking bookings ${formatDateRange(pause.start_date, pause.end_date)}`;
}

/** A neutral suggestion for the owner's message, dated to the period they picked. */
export function awayMessagePlaceholder(endDate: string): string {
  return endDate
    ? `Back after ${formatDayMonth(endDate)} — thank you for your patience.`
    : "Back soon — thank you for your patience.";
}

/** The last end date the period may have, counting its first day as day one. */
export function latestAwayEnd(startDate: string): string {
  const [year, month, day] = startDate.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1, day + AWAY_MAX_DAYS - 1));
}

/** Pending requests are the owner's to decline; confirmed and active bookings are always kept. */
export function isDeclinable(clash: AwayClash): boolean {
  return clash.status === "PENDING";
}
