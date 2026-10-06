"use client";

import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { acceptBookingMeetup } from "@/app/messages/actions";
import { meetupMapsSearchUrl } from "@/lib/meetups";
import { formatDateTime } from "@/lib/format";
import type { Message } from "@/lib/conversations";

/**
 * A meetup proposal or its acceptance, rendered as a structured message in
 * the chat (S2-19 Scenario 2) instead of a plain text bubble. Every
 * proposal/acceptance a booking has ever had stays in the thread as its own
 * immutable message - only the single still-pending one (isActionable) gets
 * Accept/Reject controls; an older, superseded proposal is just history.
 */
export function MeetupProposalCard({
  message,
  isActionable,
  pendingReschedule,
  rescheduled,
  onAccepted,
  onReject,
}: {
  message: Message;
  /** True only for the latest proposal, and only when the viewer didn't send it - the recipient is who can act on it. */
  isActionable: boolean;
  /** S2-19 Scenario 5: this is the confirmed arrangement, but a newer proposal is now awaiting a response - the old time/location are still in force until that one is accepted. */
  pendingReschedule: boolean;
  /** This was once confirmed, but a later proposal has since been accepted in its place - shown muted so it reads as history, not as a second active arrangement. */
  rescheduled: boolean;
  onAccepted: (message: Message) => void;
  /** None of the offered times work - opens the propose-a-meetup modal so the recipient can put forward new ones. */
  onReject: () => void;
}) {
  const proposal = message.meetup_proposal;
  const [acceptingTime, setAcceptingTime] = useState<string | null>(null);
  // Which of several offered times is highlighted, awaiting the Accept
  // button to confirm it - a tap only selects, so a mis-tap among several
  // close-together rows can't accidentally commit to the wrong time.
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
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
    <div
      className={`w-full max-w-[85%] overflow-hidden rounded-2xl border border-line bg-white text-sm text-ink sm:max-w-sm ${rescheduled ? "opacity-60" : ""}`}
    >
      {/* The map fills the card's full width like a header, with the details
          below it as its own panel - an Apple-Maps-style "map on top, sheet
          below" layout rather than a small thumbnail floating beside text. */}
      <a
        href={meetupMapsSearchUrl(proposal.location)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${proposal.location} on map`}
        className={`group relative block h-40 w-full sm:h-48 ${rescheduled ? "grayscale" : ""}`}
      >
        {/* pointer-events-none so the click lands on this link, not inside the map itself */}
        <iframe
          src={`https://www.google.com/maps?q=${encodeURIComponent(proposal.location)}&output=embed`}
          title={`Map of ${proposal.location}`}
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none h-full w-full"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-opacity group-hover:bg-ink/30 group-hover:opacity-100">
          <ExternalLink className="size-6 text-white" aria-hidden="true" />
        </span>
      </a>

      <div className="px-4 py-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-soft">
          {rescheduled ? "Rescheduled" : isAccepted ? "Meetup confirmed" : "Meetup proposed"}
        </p>
        <p className="mt-1 font-medium">{proposal.location}</p>

        {isAccepted ? (
          <>
            <p className={`mt-1 text-ink-soft ${rescheduled ? "line-through" : ""}`}>
              {formatDateTime(proposal.accepted_time!)}
            </p>
            {!rescheduled && pendingReschedule && (
              <Badge variant="accent" className="mt-2">
                Reschedule proposed
              </Badge>
            )}
          </>
        ) : proposal.proposed_times.length === 1 ? (
          // One time offered: Accept and Reject read as a single either/or
          // choice, so they sit side by side like the booking request's own
          // Approve/Decline pair rather than one stacked atop the other.
          <>
            <p className="mt-1 text-ink-soft">{formatDateTime(proposal.proposed_times[0])}</p>
            {isActionable && (
              <div className="mt-2 flex flex-wrap gap-3">
                <Button disabled={acceptingTime !== null} onClick={() => void accept(proposal.proposed_times[0])}>
                  {acceptingTime ? "Accepting…" : "Accept this time"}
                </Button>
                <Button variant="outline" disabled={acceptingTime !== null} onClick={onReject}>
                  Reject &amp; propose a new time
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Several times offered: tapping a row only selects it (a
                checkmark marks the pick) - accepting is a separate, explicit
                button below, so a mis-tap among several close rows can't
                accidentally commit to the wrong time. */}
            {isActionable && <p className="mt-1 text-xs text-ink-soft">Choose a time, then confirm below.</p>}
            <ul className="mt-2 overflow-hidden rounded-lg border border-line">
              {proposal.proposed_times.map((time, index) => {
                const selected = selectedTime === time;
                return (
                  <li key={time} className={index > 0 ? "border-t border-line" : ""}>
                    {isActionable ? (
                      <button
                        type="button"
                        disabled={acceptingTime !== null}
                        onClick={() => setSelectedTime(time)}
                        aria-pressed={selected}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors disabled:opacity-60 ${selected ? "bg-accent-soft" : "hover:bg-surface-muted"}`}
                      >
                        <span className={selected ? "font-medium text-accent-dark" : "text-ink-soft"}>
                          {formatDateTime(time)}
                        </span>
                        {selected && <Check className="size-4 shrink-0 text-accent-dark" aria-hidden="true" />}
                      </button>
                    ) : (
                      <p className="px-3 py-2 text-ink-soft">{formatDateTime(time)}</p>
                    )}
                  </li>
                );
              })}
            </ul>
            {isActionable && (
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  disabled={!selectedTime || acceptingTime !== null}
                  onClick={() => selectedTime && void accept(selectedTime)}
                >
                  {acceptingTime ? "Accepting…" : "Accept this time"}
                </Button>
                <Button variant="outline" disabled={acceptingTime !== null} onClick={onReject}>
                  Reject &amp; propose a new time
                </Button>
              </div>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="mt-2 text-xs text-accent-dark">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
