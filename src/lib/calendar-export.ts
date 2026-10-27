/** Only a confirmed booking offers a calendar file. */
const CALENDAR_STATUS = "CONFIRMED";

/** Today in the marketplace's time zone as YYYY-MM-DD, the same "has not ended" cut-off the backend uses. */
export function marketplaceToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(now);
}

/**
 * S4-16: whether a booking row offers "Add to calendar". A hint so the button
 * is not shown for a booking that cannot be exported; the backend decides.
 */
export function canAddToCalendar(
  booking: { status: string; end_date: string },
  today: string = marketplaceToday(),
): boolean {
  return booking.status === CALENDAR_STATUS && booking.end_date >= today;
}

/**
 * S4-16: whether a booking offers "Add meetup to calendar": it is confirmed and
 * its agreed meetup has not happened yet. A hint; the backend decides.
 */
export function canAddMeetupToCalendar(
  booking: { status: string; confirmed_meetup_time?: string | null },
  now: Date = new Date(),
): boolean {
  return booking.status === CALENDAR_STATUS && !!booking.confirmed_meetup_time && new Date(booking.confirmed_meetup_time) >= now;
}
