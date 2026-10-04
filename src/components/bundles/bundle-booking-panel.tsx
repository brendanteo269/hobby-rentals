"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  AvailabilityCalendar,
  consecutiveDatesFrom,
  nextDate,
} from "@/components/bookings/availability-calendar";
import { BookingQuoteRow, BookingQuoteSummary } from "@/components/bookings/booking-quote-summary";
import { quoteBundleBooking, requestBundleBooking } from "@/app/bookings/actions";
import { formatDate, formatMoney } from "@/lib/format";
import { rentalDurationLimits, UNAVAILABLE_REASON_LABELS } from "@/lib/listings";
import type { BundleAvailability, BundleQuote } from "@/lib/bundles";

/**
 * S2-20: the renter's booking screen for a bundle.
 *
 * Deliberately the same flow as BookingRequestForm, step for step - pick a
 * start date, pick an end date, see the quote, request it - because a renter
 * booking a set is doing the same thing as a renter booking an item, and the
 * two screens sitting side by side in the marketplace should not feel like
 * different products. The quote breakdown is literally the same component.
 *
 * What differs is only what a bundle has that an item does not: the calendar
 * offers dates every component is free at once, a blocked day names the item
 * responsible, and the price is shown against what the same gear would cost
 * booked one at a time.
 */
export function BundleBookingPanel({
  bundleId,
  availability,
  minRentalDays,
  maxRentalDays,
}: {
  bundleId: string;
  availability: BundleAvailability;
  minRentalDays: number | null;
  maxRentalDays: number | null;
}) {
  const { available_dates: availableDates, unavailable_dates: unavailableDates } = availability;
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const reasonByDate = useMemo(
    () => new Map(unavailableDates.map((entry) => [entry.date, entry.reason])),
    [unavailableDates],
  );
  // Only the dates a component blocks: the bundle's own window, schedule and
  // blackouts have no item to name, so those entries are left out rather than
  // mapped to null and checked for again at every call site.
  const blockerByDate = useMemo(
    () =>
      new Map(
        unavailableDates
          .filter((entry) => entry.listing_name !== null)
          .map((entry) => [entry.date, entry.listing_name!]),
      ),
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
  const [quote, setQuote] = useState<BundleQuote | null>(null);
  // Generated once per quoted date range and reused across retries of
  // submitting it, so a double-submit places only one wallet hold. A new
  // range gets its own key the next time a quote comes back.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const endDates = useMemo(() => {
    if (!startDate) return [];
    const maximum = maxRentalDays ?? Infinity;
    return consecutiveDatesFrom(startDate, availableSet).filter(
      (_, index) => index + 1 >= minDays && index + 1 <= maximum,
    );
  }, [availableSet, maxRentalDays, minDays, startDate]);

  // A run of bookable days ends somewhere, and the renter is told which date
  // stopped it - and which item - rather than left to guess why the calendar
  // went quiet. Only while an end date is still being chosen.
  const runBlocker = useMemo(() => {
    if (!startDate || endDate) return null;
    const lastInRun = consecutiveDatesFrom(startDate, availableSet).at(-1)!;
    const blocked = nextDate(lastInRun);
    const reason = reasonByDate.get(blocked);
    return reason ? { lastInRun, blocked, reason, who: blockerByDate.get(blocked) } : null;
  }, [startDate, endDate, availableSet, reasonByDate, blockerByDate]);

  function clearOutcome() {
    setMessage(null);
    setError(null);
    setErrorCode(undefined);
    setShortfallCents(undefined);
  }

  function pick(day: string) {
    clearOutcome();
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
        const result = await quoteBundleBooking(bundleId, startDate, day);
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
    clearOutcome();
    startTransition(async () => {
      const result = await requestBundleBooking(bundleId, startDate, endDate, idempotencyKey);
      if ("error" in result) {
        setError(result.error);
        setErrorCode(result.code);
        setShortfallCents(result.shortfallCents);
      } else {
        setMessage(
          `Request sent for ${formatDate(startDate)} – ${formatDate(endDate)}. Every item in the bundle is held until the owner answers.`,
        );
      }
    });
  }

  const anchorDate = startDates[0];
  const choosingEnd = Boolean(startDate && !endDate);

  if (!anchorDate) {
    return (
      <div className="mt-8 border-t border-line pt-6">
        <h2 className="text-base font-semibold uppercase tracking-wide">Request to book</h2>
        <p className="mt-4 text-sm text-ink-soft">
          There are no dates in the next year where every item in this bundle is free at once.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="text-base font-semibold uppercase tracking-wide">Request to book</h2>
      <p className="body-copy mt-1">
        Select an available start date, then an available end date. Only dates every item is free at
        the same time can be picked.
        {durationLimits && ` This bundle rents for ${durationLimits}.`}
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
        blockedBy={(day) => blockerByDate.get(day)}
      />

      <p className="mt-3 text-sm text-ink-soft">
        {startDate ? `From: ${formatDate(startDate)}` : "Choose a start date."}
        {endDate ? ` · Until: ${formatDate(endDate)}` : startDate ? " · Choose an end date." : ""}
      </p>

      {runBlocker && (
        <p className="mt-2 text-sm text-ink-soft">
          Bookable through {formatDate(runBlocker.lastInRun)} — {formatDate(runBlocker.blocked)} is{" "}
          {UNAVAILABLE_REASON_LABELS[runBlocker.reason].toLowerCase()}
          {runBlocker.who ? ` (${runBlocker.who})` : ""}.
        </p>
      )}

      {quote && (
        <BookingQuoteSummary
          quote={quote}
          subject="bundle"
          extra={
            <>
              <BookingQuoteRow label="Booked separately">
                <span className="text-ink-soft line-through">
                  {formatMoney(quote.components_subtotal_cents)}
                </span>
              </BookingQuoteRow>
              {quote.savings_cents > 0 && (
                <BookingQuoteRow label="You save">{formatMoney(quote.savings_cents)}</BookingQuoteRow>
              )}
            </>
          }
        />
      )}

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
      {message && (
        <p role="status" className="mt-3 text-sm text-ink-soft">
          {message}
        </p>
      )}

      <Button className="mt-4" disabled={isPending || !endDate || !quote} onClick={submit}>
        {isPending ? "Sending…" : "Request booking"}
      </Button>
    </div>
  );
}
