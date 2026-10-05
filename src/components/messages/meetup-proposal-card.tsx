"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { acceptBookingMeetup } from "@/app/messages/actions";
import { formatDateTime } from "@/lib/format";
import type { Message } from "@/lib/conversations";

/**
 * A meetup proposal or its acceptance, rendered as a structured message in
 * the chat (S2-19 Scenario 2) instead of a plain text bubble. Every
 * proposal/acceptance a booking has ever had stays in the thread as its own
 * immutable message - only the single still-pending one (isActionable) gets
 * Accept/Re-propose controls; an older, superseded proposal is just history.
 */
export function MeetupProposalCard({
  message,
  isActionable,
  onAccepted,
  onReproposeClick,
}: {
  message: Message;
  /** True only for the latest proposal, and only when the viewer didn't send it - the recipient is who can act on it. */
  isActionable: boolean;
  onAccepted: (message: Message) => void;
  onReproposeClick: () => void;
}) {
  const proposal = message.meetup_proposal;
  const [acceptingTime, setAcceptingTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!proposal) return null;

  const isAccepted = message.meetup_event_type === "ACCEPTED";

  async function accept(time: string) {
    setAcceptingTime(time);
    setError(null);
    const result = await acceptBookingMeetup(proposal!.id, time);
    if ("error" in result) {
      setError(result.error);
      setAcceptingTime(null);
      return;
    }
    onAccepted(result.message);
  }

  return (
    <div className="max-w-[80%] rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-soft">
        {isAccepted ? "Meetup confirmed" : "Meetup proposed"}
      </p>
      <p className="mt-1 font-medium">{proposal.location}</p>

      {isAccepted ? (
        <p className="mt-1 text-ink-soft">{formatDateTime(proposal.accepted_time!)}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {proposal.proposed_times.map((time) => (
            <li key={time} className="flex items-center justify-between gap-3">
              <span className="text-ink-soft">{formatDateTime(time)}</span>
              {isActionable && (
                <Button
                  variant="outline"
                  className="shrink-0 px-2.5 py-1 text-xs"
                  disabled={acceptingTime !== null}
                  onClick={() => void accept(time)}
                >
                  {acceptingTime === time ? "Accepting…" : "Accept"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isActionable && !isAccepted && (
        <button
          type="button"
          onClick={onReproposeClick}
          className="mt-2 text-xs font-medium underline underline-offset-4"
        >
          Re-propose a different time or location
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-accent-dark">
          {error}
        </p>
      )}
    </div>
  );
}
