import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Message } from "@/lib/conversations";
import type { MeetupConflictCheck } from "@/lib/meetup-conflicts";

/** Mirrors the FastAPI routes in app/routers/meetups.py. */

/** Proposes (or re-proposes) a meetup location and one or more candidate times for a confirmed booking. */
export function proposeMeetup(
  bookingId: string,
  location: string,
  proposedTimes: string[],
  acknowledgedConflicts = false,
) {
  return backendRequest<Message>(`/bookings/${encodeURIComponent(bookingId)}/meetup-proposals`, {
    method: "POST",
    body: JSON.stringify({ location, proposed_times: proposedTimes, acknowledged_conflicts: acknowledgedConflicts }),
  });
}

/** Accepts one of a proposal's candidate times as the confirmed handover arrangement. */
export function acceptMeetup(proposalId: string, acceptedTime: string, acknowledgedConflicts = false) {
  return backendRequest<Message>(`/meetup-proposals/${encodeURIComponent(proposalId)}/accept`, {
    method: "POST",
    body: JSON.stringify({ accepted_time: acceptedTime, acknowledged_conflicts: acknowledgedConflicts }),
  });
}

/** S6-01: checks times against the viewer's other meetups, the other party's, and the owner's away period. */
export function checkMeetupConflicts(bookingId: string, times: string[]) {
  return backendRequest<MeetupConflictCheck>(`/bookings/${encodeURIComponent(bookingId)}/meetup-conflicts`, {
    method: "POST",
    body: JSON.stringify({ times }),
  });
}
