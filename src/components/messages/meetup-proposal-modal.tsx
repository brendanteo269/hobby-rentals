"use client";

import { useState } from "react";
import { Button, Modal, inputBase } from "@/components/ui";
import { proposeBookingMeetup } from "@/app/messages/actions";
import type { Message } from "@/lib/conversations";

const MAX_TIMES = 5;

/**
 * Propose (or re-propose) a meetup: a location plus one or more candidate
 * times (S2-19 Scenario 1/4). Submitting appends the resulting message to
 * the thread via onSent, the same optimistic-update pattern MessageComposer
 * already uses for a sent text message - no page refetch.
 */
export function MeetupProposalModal({
  bookingId,
  onClose,
  onSent,
}: {
  bookingId: string;
  onClose: () => void;
  onSent: (message: Message) => void;
}) {
  const [location, setLocation] = useState("");
  const [times, setTimes] = useState<string[]>([""]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validTimes = times.map((t) => t.trim()).filter(Boolean);
  const canSubmit = location.trim().length > 0 && validTimes.length > 0 && !isSending;

  function updateTime(index: number, value: string) {
    setTimes((current) => current.map((t, i) => (i === index ? value : t)));
  }

  function removeTime(index: number) {
    setTimes((current) => current.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!canSubmit) return;
    setIsSending(true);
    setError(null);
    try {
      // Sent as full ISO instants: a datetime-local input has no timezone of
      // its own, so new Date(...) resolves it in the browser's - the same
      // timezone the renter and owner are arranging a real-world meetup in.
      const isoTimes = validTimes.map((t) => new Date(t).toISOString());
      const result = await proposeBookingMeetup(bookingId, location.trim(), isoTimes);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSent(result.message);
      onClose();
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Modal title="Propose a meetup" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="meetup-location" className="text-sm font-medium">
            Location
          </label>
          <input
            id="meetup-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Tampines MRT, Exit 3"
            className={`${inputBase} mt-1.5`}
          />
        </div>

        <div>
          <p className="text-sm font-medium">Proposed times</p>
          <div className="mt-1.5 space-y-2">
            {times.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={time}
                  onChange={(event) => updateTime(index, event.target.value)}
                  className={inputBase}
                />
                {times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(index)}
                    aria-label="Remove this time"
                    className="shrink-0 text-ink-soft hover:text-ink"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {times.length < MAX_TIMES && (
            <button
              type="button"
              onClick={() => setTimes((current) => [...current, ""])}
              className="mt-2 text-sm font-medium underline underline-offset-4"
            >
              Add another time
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-accent-dark">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSubmit} onClick={() => void submit()}>
          {isSending ? "Sending…" : "Send proposal"}
        </Button>
      </div>
    </Modal>
  );
}
