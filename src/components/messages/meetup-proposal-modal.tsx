"use client";

import { useState } from "react";
import { Button, Input, Modal, Select } from "@/components/ui";
import { checkBookingMeetupConflicts, proposeBookingMeetup } from "@/app/messages/actions";
import { MeetupConflictWarning } from "./meetup-conflict-warning";
import { PostalAddressFields } from "@/components/postal-address-fields";
import { usePostalAddress } from "@/components/use-postal-address";
import { clashingTimes, toTimeOfDayValue, type MeetupConflictCheck } from "@/lib/meetup-conflicts";
import { combineDateAndTime, composeMeetupLocation, TIME_OF_DAY_OPTIONS } from "@/lib/meetups";
import { LOCATION_AREAS, LOCATION_LABELS, isLocationArea, type LocationArea } from "@/lib/listings";
import { formatDate } from "@/lib/format";
import type { Message } from "@/lib/conversations";

const MAX_TIMES = 5;

/**
 * Propose (or re-propose) a meetup: a location plus one or more candidate
 * times on the booking's own pickup day (S2-19 Scenario 1/4). The date isn't
 * a choice: a back-to-back booking means the item can still be with the
 * previous renter until that exact day, so a meetup proposed any earlier
 * could promise an item the owner doesn't have yet. Submitting appends the
 * resulting message to the thread via onSent, the same optimistic-update
 * pattern MessageComposer already uses for a sent text message - no page
 * refetch.
 */
export function MeetupProposalModal({
  bookingId,
  defaultLocationArea,
  pickupDate,
  onClose,
  onSent,
}: {
  bookingId: string;
  /** S2-19 UX follow-up: the listing's own area, offered as the location's starting point. */
  defaultLocationArea: string | null;
  /** The booking's own start date - the only day a meetup may be proposed for. */
  pickupDate: string;
  onClose: () => void;
  onSent: (message: Message) => void;
}) {
  const prefillArea = defaultLocationArea && isLocationArea(defaultLocationArea) ? defaultLocationArea : null;
  const [mode, setMode] = useState<"area" | "custom">(prefillArea ? "area" : "custom");
  const [area, setArea] = useState<LocationArea | "">(prefillArea ?? "");
  const [detail, setDetail] = useState("");
  // The postal-code lookup is shared with the delivery form; it is paused while an area is chosen instead.
  const postalAddress = usePostalAddress(mode === "custom");
  const { address } = postalAddress;
  const [times, setTimes] = useState<string[]>([""]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<MeetupConflictCheck | null>(null);

  const location = composeMeetupLocation(
    mode === "area" ? { mode, area, detail } : { mode, address },
  );
  const validTimes = times.map((time) => combineDateAndTime(pickupDate, time)).filter((iso) => iso !== null);
  const canSubmit = location.length > 0 && validTimes.length > 0 && !isSending;

  function updateTime(index: number, time: string) {
    setTimes((current) => current.map((t, i) => (i === index ? time : t)));
  }

  function removeTime(index: number) {
    setTimes((current) => current.filter((_, i) => i !== index));
  }

  /** Sends the proposal; `acknowledged` once the person has seen and accepted a clash warning. */
  async function send(acknowledged: boolean) {
    setIsSending(true);
    setError(null);
    try {
      const result = await proposeBookingMeetup(bookingId, location, validTimes, acknowledged);
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

  /** S6-01: checks the times first; a clash or an away owner is shown before anything is sent. */
  async function submit() {
    if (!canSubmit) return;
    setIsSending(true);
    setError(null);
    const result = await checkBookingMeetupConflicts(bookingId, validTimes);
    setIsSending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    if (result.check.blocked_reason || clashingTimes(result.check).length > 0) {
      setConflicts(result.check);
      return;
    }
    await send(false);
  }

  /** Swaps a suggested free slot in for the clashing time and returns to the form to review it. */
  function pickSuggestion(clashingTime: string, suggestion: string) {
    const slot = toTimeOfDayValue(suggestion);
    setTimes((current) => {
      // Keep each remaining time unique so the same slot isn't offered twice.
      const next = current.map((t) => (combineDateAndTime(pickupDate, t) === clashingTime ? slot : t));
      return next.filter((t, i) => next.indexOf(t) === i);
    });
    setConflicts(null);
  }

  return (
    <>
    <Modal title="Propose a meetup" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <div>
          <span className="text-sm font-medium">Location</span>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="meetup-location-mode"
                className="accent-ink"
                checked={mode === "area"}
                onChange={() => setMode("area")}
              />
              Choose an area
            </label>
            {mode === "area" && (
              <div className="ml-6 max-w-sm space-y-2">
                <Select
                  aria-label="Area"
                  className="w-full"
                  value={area}
                  onChange={(event) => setArea(event.target.value as LocationArea)}
                >
                  <option value="" disabled>
                    Choose one
                  </option>
                  {LOCATION_AREAS.map((value) => (
                    <option key={value} value={value}>
                      {LOCATION_LABELS[value]}
                    </option>
                  ))}
                </Select>
                <div>
                  <label htmlFor="meetup-area-detail" className="block text-xs font-medium text-ink-soft">
                    Meeting point detail (optional)
                  </label>
                  <Input
                    id="meetup-area-detail"
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    placeholder="e.g. Exit 3, or Blk 123 / Ave 3"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="meetup-location-mode"
                className="accent-ink"
                checked={mode === "custom"}
                onChange={() => setMode("custom")}
              />
              Custom address
            </label>
            {mode === "custom" && (
              <div className="ml-6">
                <PostalAddressFields lookup={postalAddress} />
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Proposed times</p>
          <div className="mt-1.5 space-y-2">
            {times.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                {/* Fixed to the booking's own start date - disabled rather
                    than editable, since any other day risks promising an
                    item that's still with a previous renter. */}
                <Input value={formatDate(pickupDate)} disabled readOnly aria-label="Date" className="min-w-0 flex-1" />
                <div className="w-32 shrink-0">
                  <Select aria-label="Time" value={time} onChange={(event) => updateTime(index, event.target.value)}>
                    <option value="" disabled>
                      Time
                    </option>
                    {TIME_OF_DAY_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
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
    {conflicts && (
      <MeetupConflictWarning
        check={conflicts}
        isSending={isSending}
        onClose={() => setConflicts(null)}
        onGoAhead={() => void send(true)}
        onPickSuggestion={pickSuggestion}
      />
    )}
    </>
  );
}
