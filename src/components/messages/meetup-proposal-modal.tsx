"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Modal, Select } from "@/components/ui";
import { proposeBookingMeetup } from "@/app/messages/actions";
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
  const [postal, setPostal] = useState("");
  const [address, setAddress] = useState("");
  const [postalLookup, setPostalLookup] = useState<"idle" | "loading" | "found" | "not-found" | "error">("idle");
  const [times, setTimes] = useState<string[]>([""]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The postal code a lookup has already resolved address for. Switching to
  // "Choose an area" and back to "Custom address" re-runs this effect (mode
  // is one of its triggers), but re-fetching the same postal code would
  // silently overwrite any edit made to the address field since - skipped
  // whenever the postal code itself hasn't actually changed.
  const resolvedPostalRef = useRef<string | null>(null);

  // Looks up the postal code once it's a complete 6-digit SG code, debounced
  // so it doesn't fire on every keystroke. The resolved address only ever
  // pre-fills the (still freely editable) address field - a lookup never
  // blocks or overwrites something the renter/owner has already typed over.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (mode !== "custom" || !/^\d{6}$/.test(postal)) {
        setPostalLookup("idle");
        return;
      }
      if (postal === resolvedPostalRef.current) {
        setPostalLookup("found");
        return;
      }
      setPostalLookup("loading");
      void (async () => {
        try {
          const response = await fetch(`/api/onemap/search?postal=${postal}`, { signal: controller.signal });
          const body = (await response.json()) as { results?: { address: string }[]; error?: string };
          if (!response.ok || !body.results) {
            setPostalLookup("error");
            return;
          }
          if (body.results.length === 0) {
            setPostalLookup("not-found");
            return;
          }
          resolvedPostalRef.current = postal;
          setAddress(body.results[0].address);
          setPostalLookup("found");
        } catch (caught) {
          if (!(caught instanceof DOMException && caught.name === "AbortError")) setPostalLookup("error");
        }
      })();
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, postal]);

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

  async function submit() {
    if (!canSubmit) return;
    setIsSending(true);
    setError(null);
    try {
      const result = await proposeBookingMeetup(bookingId, location, validTimes);
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
              <div className="ml-6 max-w-sm space-y-2">
                <div>
                  <Input
                    value={postal}
                    onChange={(event) => setPostal(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="Postal code, e.g. 118956"
                  />
                  {postalLookup === "loading" && <p className="mt-1 text-xs text-ink-soft">Looking up address…</p>}
                  {postalLookup === "found" && (
                    <p className="mt-1 text-xs text-ink-soft">Address filled in below — edit it if needed.</p>
                  )}
                  {postalLookup === "not-found" && (
                    <p className="mt-1 text-xs text-ink-soft">No address found for that postal code.</p>
                  )}
                  {postalLookup === "error" && (
                    <p className="mt-1 text-xs text-ink-soft">Couldn&apos;t look that up — type the address below.</p>
                  )}
                </div>
                <Input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="e.g. 123 Example St"
                />
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
  );
}
