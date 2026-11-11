"use client";

import { Modal, Button } from "@/components/ui";
import {
  clashingTimes,
  conflictMessages,
  formatClockTime,
  type MeetupConflictCheck,
} from "@/lib/meetup-conflicts";
import { formatDateTime } from "@/lib/format";

/**
 * S6-01: shown before a meetup is proposed or accepted when it clashes with a
 * meetup the viewer or the other party already has, or the owner is away.
 *
 * An away owner is a hard stop (no way forward but closing). A clash is only a
 * warning: the person can go ahead after reading it, or tap one of up to three
 * nearby free slots instead. Dismissing never sends anything.
 *
 * Suggestions are only offered where the caller can act on them
 * (`onPickSuggestion`): when proposing, a tap swaps the time into the form; when
 * accepting, the times are fixed by the proposer, so `onProposeInstead` offers
 * to counter with a new time.
 */
export function MeetupConflictWarning({
  check,
  isSending,
  onGoAhead,
  onClose,
  onPickSuggestion,
  onProposeInstead,
}: {
  check: MeetupConflictCheck;
  isSending: boolean;
  onGoAhead: () => void;
  onClose: () => void;
  /** Swaps `suggestion` in for the clashing `time`; absent when the time can't be changed from here. */
  onPickSuggestion?: (time: string, suggestion: string) => void;
  /** Opens the propose form, for when the clashing time can't be edited in place. */
  onProposeInstead?: () => void;
}) {
  if (check.blocked_reason) {
    return (
      <Modal title="Can't arrange a meetup" onClose={onClose}>
        <p role="alert" className="mt-4 text-sm text-ink-soft">
          {check.blocked_reason}
        </p>
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onClose}>
            OK
          </Button>
        </div>
      </Modal>
    );
  }

  const clashes = clashingTimes(check);
  return (
    <Modal title="This time may clash" onClose={onClose}>
      <ul className="mt-4 space-y-5 text-sm">
        {clashes.map((entry) => (
          <li key={entry.time}>
            <p className="font-medium">{formatDateTime(entry.time)}</p>
            {conflictMessages(entry).map((line) => (
              <p key={line} className="mt-1 text-ink-soft">
                {line}
              </p>
            ))}
            {onPickSuggestion && entry.suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-ink-soft">Free for both of you:</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {entry.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      disabled={isSending}
                      onClick={() => onPickSuggestion(entry.time, suggestion)}
                    >
                      {formatClockTime(suggestion)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {onProposeInstead && (
          <Button
            type="button"
            variant="outline"
            disabled={isSending}
            onClick={onProposeInstead}
          >
            Propose another time
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isSending}
          onClick={onClose}
        >
          Pick another time
        </Button>
        <Button type="button" disabled={isSending} onClick={onGoAhead}>
          {isSending ? "Sending…" : "Go ahead anyway"}
        </Button>
      </div>
    </Modal>
  );
}
