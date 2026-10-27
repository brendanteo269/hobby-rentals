/** S4-16: what to do with the backend's answer - download a file, or tell the member there is nothing to export. */
export type CalendarOutcome =
  | { kind: "download"; filename: string; ics: string; count: number }
  | { kind: "empty"; message: string };

export const NO_BOOKINGS_TO_EXPORT = "You have no confirmed bookings to export.";

export function calendarOutcome(result: { event_count: number; filename: string; ics: string }): CalendarOutcome {
  if (result.event_count === 0 || !result.ics) return { kind: "empty", message: NO_BOOKINGS_TO_EXPORT };
  return { kind: "download", filename: result.filename, ics: result.ics, count: result.event_count };
}
