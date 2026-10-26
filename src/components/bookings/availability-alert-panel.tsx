"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, FormNotice } from "@/components/ui";
import {
  AvailabilityCalendar,
  consecutiveDatesFrom,
} from "@/components/bookings/availability-calendar";
import { cancelAlert, setAlert } from "@/app/availability-alerts/actions";
import { formatDate } from "@/lib/format";
import {
  activeAlertFor,
  blockedDates,
  rangeIsBlocked,
  type AvailabilityAlert,
} from "@/lib/availability-alerts";
import type { UnavailableDate } from "@/lib/listings";

/**
 * S4-07: being told when dates the owner blocked out open up again.
 *
 * Sits beside the waitlist panel and answers the other half of "these dates
 * are refused". The waitlist is for days another renter holds, which can only
 * go to one person; this is for days the owner closed, which nobody holds -
 * so there is no queue, no offer window, and every watcher is told at once.
 *
 * Renders its own calendar over exactly the days the booking form struck
 * through as BLACKOUT, for the same reason the waitlist panel does: the
 * booking calendar refuses to select an unavailable day, which is precisely
 * the day being asked about here.
 *
 * Nothing is reserved by an alert, and the panel says so - a renter told
 * "those dates are free" who assumed they were held would be worse off than
 * one who never set the alert.
 */
export function AvailabilityAlertPanel({
  listingId,
  unavailableDates,
  alerts,
}: {
  listingId: string;
  unavailableDates: UnavailableDate[];
  alerts: AvailabilityAlert[];
}) {
  const blocked = useMemo(() => blockedDates(unavailableDates), [unavailableDates]);
  const blockedList = useMemo(() => [...blocked].sort(), [blocked]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const watching = alerts.filter((alert) => alert.status === "ACTIVE");
  const existing = activeAlertFor(alerts, startDate, endDate);
  const endOptions = useMemo(
    () => (startDate ? consecutiveDatesFrom(startDate, blocked) : []),
    [startDate, blocked],
  );
  const reasonByDate = useMemo(
    () => new Map(unavailableDates.map((entry) => [entry.date, entry.reason] as const)),
    [unavailableDates],
  );

  // Nothing the owner has closed, so nothing to watch for.
  if (blockedList.length === 0 && watching.length === 0) return null;

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setAlert(listingId, startDate, endDate);
      if ("error" in result) setError(result.error);
      else {
        setMessage(`We will tell you if ${formatDate(startDate)} – ${formatDate(endDate)} opens up.`);
        setStartDate("");
        setEndDate("");
      }
    });
  }

  function stop(alertId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await cancelAlert(alertId);
      if ("error" in result) setError(result.error);
      else setMessage("Alert cancelled. We will not tell you about those dates.");
    });
  }

  return (
    <section aria-labelledby="availability-alert-heading" className="mt-10 border-t border-line pt-6">
      <h2 id="availability-alert-heading" className="heading text-xl">
        Blocked-out dates
      </h2>
      <p className="body-copy mt-2">
        The owner has closed some dates. Set an alert and we will tell you if they open up &mdash;
        nothing is held for you, so you would still need to request it.
      </p>

      {watching.length > 0 && (
        <ul className="mt-4 space-y-2">
          {watching.map((alert) => (
            <li
              key={alert.id}
              className="flex flex-wrap items-center justify-between gap-2 bg-surface-muted px-3 py-2 text-sm"
            >
              <span>
                Watching {formatDate(alert.start_date)} – {formatDate(alert.end_date)}
              </span>
              <Button
                variant="outline"
                className="px-3 py-1.5 text-xs"
                disabled={isPending}
                onClick={() => stop(alert.id)}
              >
                Cancel alert
              </Button>
            </li>
          ))}
        </ul>
      )}

      {blockedList.length > 0 && (
        <>
          <p className="mt-5 text-sm font-medium text-ink">Pick the dates you want</p>
          <AvailabilityCalendar
            availableDates={blockedList}
            anchorDate={startDate || blockedList[0]}
            // Once a start is picked, only the run of blocked days from it:
            // an alert covers one continuous range, and a gap in the middle
            // is a date that is already bookable.
            selectableDates={startDate ? endOptions : blockedList}
            reasonByDate={reasonByDate}
            startDate={startDate}
            endDate={endDate}
            onPick={(day: string) => {
              if (!startDate || endDate || day < startDate) {
                setStartDate(day);
                setEndDate("");
              } else {
                setEndDate(day);
              }
            }}
          />
          {startDate && (
            <p className="mt-2 text-sm text-ink-soft">
              From: {formatDate(startDate)}
              {endDate && ` · Until: ${formatDate(endDate)}`}
              {!endDate && endOptions.length > 0 && " · now pick the last day"}
            </p>
          )}
          <FormNotice message={error ?? undefined} />
          {message && (
            <p role="status" className="mt-3 text-sm text-ink-soft">
              {message}
            </p>
          )}
          <div className="mt-4">
            <Button
              disabled={
                isPending ||
                !startDate ||
                !endDate ||
                Boolean(existing) ||
                !rangeIsBlocked(startDate, endDate, blocked)
              }
              onClick={submit}
            >
              {isPending ? "Setting…" : existing ? "Already watching these dates" : "Alert me"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
