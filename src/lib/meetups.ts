import type { Message, MeetupProposal } from "@/lib/conversations";

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
