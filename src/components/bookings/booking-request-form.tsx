"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  AvailabilityCalendar,
  consecutiveDatesFrom,
  nextDate,
} from "@/components/bookings/availability-calendar";
import { BookingQuoteSummary } from "@/components/bookings/booking-quote-summary";
import { quoteBooking, requestBooking } from "@/app/bookings/actions";
import type { BookingQuote } from "@/lib/api/bookings";
import type { Booking } from "@/lib/bookings";
import { formatDate, formatMoney } from "@/lib/format";
import {
  rentalDurationLimits,
  UNAVAILABLE_REASON_LABELS,
  type UnavailableDate,
} from "@/lib/listings";

type Props = {
  listingId: string;
  availableDates: string[];
  /** Days inside the window that cannot be booked, and why. */
  unavailableDates: UnavailableDate[];
  minRentalDays: number | null;
  maxRentalDays: number | null;
  /** Rendered beside the submit button, e.g. a "Message owner" link - this form's own concern is booking, not what else belongs next to it. */
  secondaryAction?: ReactNode;
  /** Called with the created (or replayed) booking right after a successful request, alongside the form's own inline confirmation - lets an embedding caller (BookingRequestModal) react without a page refetch. */
  onSuccess?: (booking: Booking) => void;
  /** Drops the form's own "Request to book" heading and top divider - set when a caller already supplies its own heading, e.g. a Modal's title. */
  hideHeading?: boolean;
};

export function BookingRequestForm({
  listingId,
  availableDates,
  unavailableDates,
  minRentalDays,
  maxRentalDays,
  secondaryAction,
  onSuccess,
  hideHeading,
}: Props) {
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const reasonByDate = useMemo(
    () => new Map(unavailableDates.map((entry) => [entry.date, entry.reason])),
    [unavailableDates],
  );
  const hasBookedDays = useMemo(
    () => unavailableDates.some((entry) => entry.reason === "BOOKED"),
    [unavailableDates],
  );
  const durationLimits = rentalDurationLimits({
    min_rental_days: minRentalDays,
    max_rental_days: maxRentalDays,
  });
  const minDays = minRentalDays ?? 1;
  const startDates = useMemo(
    () => availableDates.filter((date) => consecutiveDatesFrom(date, availableSet).length >= minDays),
    [availableDates, availableSet, minDays],
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [shortfallCents, setShortfallCents] = useState<number | undefined>();
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  // Generated once per quoted date range and reused across retries of
  // submitting it (e.g. a request that times out but actually succeeds
  // server-side), so a double-submit places only one wallet hold. A new
  // range gets its own key the next time a quote comes back.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const endDates = useMemo(() => {
    if (!startDate) return [];
    const maximum = maxRentalDays ?? Infinity;
    return consecutiveDatesFrom(startDate, availableSet).filter((_, index) => index + 1 >= minDays && index + 1 <= maximum);
  }, [availableSet, maxRentalDays, minDays, startDate]);

  // S2-08 Scenario 2: a run of bookable days ends somewhere, and the renter
  // is told which date stopped it rather than left to guess why the calendar
  // went quiet. Only while an end date is still being chosen - once the
  // period is complete there is no thwarted selection to explain.
  const runBlocker = useMemo(() => {
    if (!startDate || endDate) return null;
    const lastInRun = consecutiveDatesFrom(startDate, availableSet).at(-1)!;
    const blocked = nextDate(lastInRun);
    const reason = reasonByDate.get(blocked);
    return reason ? { lastInRun, blocked, reason } : null;
  }, [startDate, endDate, availableSet, reasonByDate]);

  // Open on the first date that can actually start a valid rental, rather
  // than on a month containing only disabled days before it.
  const anchorDate = startDates[0];
  const choosingEnd = Boolean(startDate && !endDate);

  function pick(day: string) {
    setMessage(null);
    setError(null);
    setErrorCode(undefined);
    setShortfallCents(undefined);
    if (!startDate || endDate) {
      setStartDate(day);
      setEndDate("");
      setQuote(null);
      setIdempotencyKey(null);
    } else if (endDates.includes(day)) {
      setEndDate(day);
      setQuote(null);
      setIdempotencyKey(null);
      startTransition(async () => {
        const result = await quoteBooking(listingId, startDate, day);
        if ("error" in result) setError(result.error);
        else {
          setQuote(result.quote);
          setIdempotencyKey(crypto.randomUUID());
        }
      });
    }
  }

  function submit() {
    if (!startDate || !endDate || !idempotencyKey) return;
    setMessage(null);
    setError(null);
    setErrorCode(undefined);
    setShortfallCents(undefined);
    startTransition(async () => {
      const result = await requestBooking(listingId, startDate, endDate, idempotencyKey);
      if ("error" in result) {
        setError(result.error);
        setErrorCode(result.code);
        setShortfallCents(result.shortfallCents);
      }
      else {
        const held = result.booking.total_amount_cents;
        setMessage(
          `Request sent for ${formatDate(startDate)} – ${formatDate(endDate)}.` +
            (held ? ` ${formatMoney(held)} is on hold in your wallet until the owner responds.` : ""),
        );
        onSuccess?.(result.booking);
      }
    });
  }

  if (!anchorDate) {
    return (
      <div className={hideHeading ? "" : "mt-8 border-t border-line pt-6"}>
        {!hideHeading && <h2 className="text-base font-semibold uppercase tracking-wide">Request to book</h2>}
        <p className="mt-4 text-sm text-ink-soft">There are no bookable dates available in the next year.</p>
        {secondaryAction && <div className="mt-4">{secondaryAction}</div>}
      </div>
    );
  }

  return (
    <div className={hideHeading ? "" : "mt-8 border-t border-line pt-6"}>
      {!hideHeading && <h2 className="text-base font-semibold uppercase tracking-wide">Request to book</h2>}
      <p className="body-copy mt-1">
        Select an available start date, then an available end date.
        {durationLimits && ` This listing rents for ${durationLimits}.`}
        {hasBookedDays && " Struck-through days are already booked."}
      </p>

      <AvailabilityCalendar
        availableDates={availableDates}
        anchorDate={anchorDate}
        selectableDates={choosingEnd ? endDates : startDates}
        reasonByDate={reasonByDate}
        startDate={startDate}
        endDate={endDate}
        onPick={pick}
      />

      <p className="mt-3 text-sm text-ink-soft">
        {startDate ? `From: ${formatDate(startDate)}` : "Choose a start date."}
        {endDate ? ` · Until: ${formatDate(endDate)}` : startDate ? " · Choose an end date." : ""}
      </p>

      {runBlocker && (
        <p className="mt-2 text-sm text-ink-soft">
          Bookable through {formatDate(runBlocker.lastInRun)} —{" "}
          {formatDate(runBlocker.blocked)} is{" "}
          {UNAVAILABLE_REASON_LABELS[runBlocker.reason].toLowerCase()}.
        </p>
      )}

      {quote && <BookingQuoteSummary quote={quote} />}
      {error && (
        <p role="alert" className="mt-3 text-sm text-accent-dark">
          {errorCode === "INSUFFICIENT_BALANCE" && shortfallCents !== undefined
            ? `Insufficient wallet balance — you're ${formatMoney(shortfallCents)} short.`
            : error}
        </p>
      )}
      {errorCode === "INSUFFICIENT_BALANCE" && (
        <Link href="/profile?view=wallet" className="mt-2 block w-fit text-sm font-medium underline underline-offset-4">
          Top up your wallet
        </Link>
      )}
      {message && <p role="status" className="mt-3 text-sm text-ink-soft">{message}</p>}
      <div className={`mt-4 flex flex-wrap items-center gap-3 ${hideHeading ? "justify-end" : ""}`}>
        <Button disabled={isPending || !endDate || !quote} onClick={submit}>{isPending ? "Sending…" : "Request booking"}</Button>
        {secondaryAction}
      </div>
    </div>
  );
}
