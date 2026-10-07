import type { Message, MeetupProposal } from "@/lib/conversations";
import { LOCATION_LABELS, type LocationArea } from "@/lib/listings";
import { toIsoDate } from "@/lib/format";

export type MeetupState = {
  /**
   * The latest *accepted* proposal, if any - the currently confirmed
   * arrangement. Stays set even once a newer, still-unaccepted proposal
   * exists: sending a new proposal never touches an earlier accepted one
   * (S2-19 Scenario 5), so the old arrangement remains "confirmed" until a
   * replacement is itself accepted.
   */
  confirmed: MeetupProposal | null;
  /** The latest proposal, only if it hasn't been accepted (or superseded) yet - still awaiting a response. */
  pending: MeetupProposal | null;
};

/**
 * Derives the booking's current meetup state entirely from the thread's
 * already-fetched messages - no dedicated endpoint, the same way
 * EnquiryBookingStatus derives its state from the bookings list rather than
 * fetching one of its own.
 */
export function deriveMeetupState(messages: Message[]): MeetupState {
  const meetupMessages = messages.filter((message) => message.meetup_proposal);
  const confirmed =
    [...meetupMessages].reverse().find((message) => message.meetup_proposal?.accepted_time)?.meetup_proposal ?? null;
  const latest = meetupMessages.at(-1)?.meetup_proposal ?? null;
  const pending = latest && !latest.accepted_time ? latest : null;
  return { confirmed, pending };
}

/**
 * Every quarter-hour of a day, as a `<select>` of time-of-day options.
 *
 * The business only ever meets on 15-minute slots, so this is offered as a
 * fixed list rather than a freeform time input - there's then no minute to
 * mistype and nothing to round.
 */
export const TIME_OF_DAY_OPTIONS: { value: string; label: string }[] = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const label = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { value, label };
});

/**
 * Combines a `type="date"` value and a `TIME_OF_DAY_OPTIONS` value into an
 * ISO instant, or null while either half is still unset - the pair is kept
 * as two separate inputs in the form, but the API only wants one instant.
 */
export function combineDateAndTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** What the meetup modal's location field sends, from either of its two modes. */
export type MeetupLocationInput =
  | { mode: "area"; area: LocationArea | ""; detail: string }
  | { mode: "custom"; address: string };

/**
 * Builds the single `location` string the API expects from the modal's
 * area-or-custom-address input - the backend has no structured sub-fields for
 * this, so an exit/meeting-point detail rides along as plain suffix text
 * rather than a column of its own.
 */
export function composeMeetupLocation(input: MeetupLocationInput): string {
  if (input.mode === "custom") return input.address.trim();
  if (!input.area) return "";
  const detail = input.detail.trim();
  return detail ? `${LOCATION_LABELS[input.area]}, ${detail}` : LOCATION_LABELS[input.area];
}

/** A Google Maps search for a meetup's location text - works for both a chosen area and a free-text address, with no geocoding of our own needed. */
export function meetupMapsSearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/**
 * The next `count` calendar days starting today, ascending.
 *
 * Reused as AvailabilityCalendar's paging window for a meetup date - unlike a
 * rental, a meetup isn't limited to a listing's own availability, so every
 * upcoming day is offered rather than a filtered set.
 */
export function upcomingDates(count: number, from: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    toIsoDate(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)),
  );
}
