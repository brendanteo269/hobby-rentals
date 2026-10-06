import { MapPin, ExternalLink } from "lucide-react";
import { meetupMapsSearchUrl } from "@/lib/meetups";
import { formatDateTime } from "@/lib/format";
import type { MeetupProposal } from "@/lib/conversations";

/**
 * A pinned-message-style bar reminding both parties of the booking's current
 * meetup arrangement, so it's visible without scrolling back through the
 * thread to find the message that confirmed it. Stays up even once a
 * reschedule has been proposed (S2-19 Scenario 5) - the pinned details are
 * the ones still in force until that new proposal is itself accepted.
 */
export function ConfirmedMeetupBar({
  confirmed,
  rescheduleProposed,
}: {
  confirmed: MeetupProposal;
  rescheduleProposed: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5 text-xs">
      <span className="flex items-center gap-1.5 font-medium text-ink">
        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
        Meetup confirmed: {confirmed.location} · {formatDateTime(confirmed.accepted_time!)}
      </span>
      <a
        href={meetupMapsSearchUrl(confirmed.location)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
      >
        View on map
        <ExternalLink className="size-3" aria-hidden="true" />
      </a>
      {rescheduleProposed && (
        <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold uppercase tracking-wide text-accent-dark">
          Reschedule proposed
        </span>
      )}
    </div>
  );
}
