import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Message } from "@/lib/conversations";

/** Mirrors the FastAPI routes in app/routers/meetups.py. */

/** Proposes (or re-proposes) a meetup location and one or more candidate times for a confirmed booking. */
export function proposeMeetup(bookingId: string, location: string, proposedTimes: string[]) {
  return backendRequest<Message>(`/bookings/${encodeURIComponent(bookingId)}/meetup-proposals`, {
    method: "POST",
    body: JSON.stringify({ location, proposed_times: proposedTimes }),
  });
}

/** Accepts one of a proposal's candidate times as the confirmed handover arrangement. */
export function acceptMeetup(proposalId: string, acceptedTime: string) {
  return backendRequest<Message>(`/meetup-proposals/${encodeURIComponent(proposalId)}/accept`, {
    method: "POST",
    body: JSON.stringify({ accepted_time: acceptedTime }),
  });
}
