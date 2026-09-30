"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { quoteBooking, requestBooking } from "@/app/bookings/actions";
import type { BookingQuote } from "@/lib/api/bookings";
import { formatDate, formatMoney } from "@/lib/format";
import {
  rentalDurationLimits,
  UNAVAILABLE_REASON_LABELS,
  WEEKDAY_LABELS,
  type UnavailableDate,
} from "@/lib/listings";

const LOCALE = "en-SG";

type Props = {
  listingId: string;
  availableDates: string[];
  /** Days inside the window that cannot be booked, and why. */
  unavailableDates: UnavailableDate[];
  minRentalDays: number | null;
  maxRentalDays: number | null;
};

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function nextDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return iso(new Date(year, month - 1, day + 1));
}

function monthOf(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month: month - 1 };
}

/** A booking occupies every date in its range, so only continuous runs can be selected. */
function consecutiveDatesFrom(startDate: string, availableDates: Set<string>) {
  const dates = [startDate];
  while (availableDates.has(nextDate(dates.at(-1)!))) dates.push(nextDate(dates.at(-1)!));
  return dates;
}

export function BookingRequestForm({
  listingId,
  availableDates,
  unavailableDates,
  minRentalDays,
  maxRentalDays,
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
  const [paged, setPaged] = useState<{ year: number; month: number } | null>(null);
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

  // Begin at the first date that can actually start a valid rental, rather
  // than showing a month containing only disabled days before it.
  const firstAvailable = startDates[0];
  const lastAvailable = availableDates.at(-1);
  const firstMonth = firstAvailable ? monthOf(firstAvailable) : null;
  const lastMonth = lastAvailable ? monthOf(lastAvailable) : null;
  const ordinal = (value: { year: number; month: number }) => value.year * 12 + value.month;
  const month = (() => {
    if (!firstMonth || !lastMonth) return null;
    const fallback = startDate ? monthOf(startDate) : firstMonth;
    if (!paged || ordinal(paged) < ordinal(firstMonth)) return firstMonth;
    if (ordinal(paged) > ordinal(lastMonth)) return lastMonth;
    return paged ?? fallback;
  })();

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
      else setMessage(`Request sent for ${formatDate(startDate)} – ${formatDate(endDate)}.`);
    });
  }

  if (!month || !firstMonth || !lastMonth) {
    return (
      <div className="mt-8 border-t border-line pt-6">
        <h2 className="text-base font-semibold uppercase tracking-wide">Request to book</h2>
        <p className="mt-4 text-sm text-ink-soft">There are no bookable dates available in the next year.</p>
      </div>
    );
  }

  const lead = (new Date(month.year, month.month, 1).getDay() + 6) % 7;
  const length = new Date(month.year, month.month + 1, 0).getDate();
  const label = new Date(month.year, month.month, 1).toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
  const canGoBack = ordinal(month) > ordinal(firstMonth);
  const canGoForward = ordinal(month) < ordinal(lastMonth);

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="text-base font-semibold uppercase tracking-wide">Request to book</h2>
      <p className="body-copy mt-1">
        Select an available start date, then an available end date.
        {durationLimits && ` This listing rents for ${durationLimits}.`}
        {hasBookedDays && " Struck-through days are already booked."}
      </p>

      <div className="mt-4 max-w-sm rounded-2xl border border-line select-none">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <button type="button" onClick={() => setPaged({ year: month.year, month: month.month - 1 })} disabled={!canGoBack} aria-label="Previous month" className="rounded-full px-2 py-1 text-sm text-ink-soft hover:bg-surface-muted disabled:opacity-30">‹</button>
          <span className="text-sm font-medium">{label}</span>
          <button type="button" onClick={() => setPaged({ year: month.year, month: month.month + 1 })} disabled={!canGoForward} aria-label="Next month" className="rounded-full px-2 py-1 text-sm text-ink-soft hover:bg-surface-muted disabled:opacity-30">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 p-3">
          {WEEKDAY_LABELS.map((day) => <span key={day} className="pb-1 text-center text-[0.6875rem] text-ink-soft">{day.charAt(0)}</span>)}
          {Array.from({ length: lead }, (_, index) => <span key={`lead-${index}`} />)}
          {Array.from({ length }, (_, index) => {
            const day = iso(new Date(month.year, month.month, index + 1));
            const choosingEnd = Boolean(startDate && !endDate);
            const selectable = choosingEnd ? endDates.includes(day) : startDates.includes(day);
            const selected = day === startDate || day === endDate;
            const inRange = Boolean(startDate && endDate && day > startDate && day < endDate);
            // Only a day the listing itself refuses carries a reason. One
            // that is merely unpickable right now - before the chosen start,
            // or past the maximum length - stays plainly dimmed, since
            // nothing is wrong with the date.
            const reason = selectable ? undefined : reasonByDate.get(day);
            const unavailableStyle =
              reason === "BOOKED"
                ? "cursor-not-allowed text-ink-soft line-through"
                : "cursor-default text-ink-soft/30";
            return (
              <button
                key={day}
                type="button"
                disabled={!selectable}
                onClick={() => pick(day)}
                aria-pressed={selected}
                aria-label={reason ? `${formatDate(day)}, ${UNAVAILABLE_REASON_LABELS[reason].toLowerCase()}` : undefined}
                title={reason ? UNAVAILABLE_REASON_LABELS[reason] : undefined}
                className={`aspect-square rounded-lg text-sm transition-colors ${selected ? "bg-ink text-white" : inRange ? "bg-surface-muted text-ink" : selectable ? "hover:bg-surface-muted" : unavailableStyle}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

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

      {quote && (
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          {quote.lines.map((line) => (
            <div key={`${line.unit}-${line.count}`} className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-soft">
                {line.count} {line.unit}
                {line.count === 1 ? "" : "s"} × {formatMoney(line.rate_cents)}
                {line.capped_from_days && (
                  <span className="text-xs">
                    {" "}
                    (for {line.capped_from_days} days —{" "}
                    {quote.price_per_day_cents === null
                      ? "this listing rents by the week"
                      : "cheaper than the daily rate"}
                    )
                  </span>
                )}
              </dt>
              <dd>{formatMoney(line.amount_cents)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-1">
            <dt className="text-ink-soft">
              {quote.price_per_day_cents === null ? "Weekly rate" : "Daily rate"}
            </dt>
            <dd>
              {formatMoney(quote.price_per_day_cents ?? quote.price_per_week_cents ?? 0)}
              {quote.price_per_day_cents === null && " / week"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">Rental subtotal</dt>
            <dd>{formatMoney(quote.rental_subtotal_cents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">Platform fee</dt>
            <dd>{formatMoney(quote.platform_fee_cents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">Security deposit</dt>
            <dd>{formatMoney(quote.deposit_cents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-1 font-semibold">
            <dt>
              Total · {quote.rental_days} {quote.rental_days === 1 ? "day" : "days"}
            </dt>
            <dd>{formatMoney(quote.total_amount_cents)}</dd>
          </div>
        </dl>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-accent-dark">
          {errorCode === "INSUFFICIENT_BALANCE" && shortfallCents !== undefined
            ? `Insufficient wallet balance — you're ${formatMoney(shortfallCents)} short.`
            : error}
        </p>
      )}
      {errorCode === "INSUFFICIENT_BALANCE" && (
        <Link href="/profile?view=wallet" className="mt-2 inline-block text-sm font-medium underline underline-offset-4">
          Top up your wallet
        </Link>
      )}
      {message && <p role="status" className="mt-3 text-sm text-ink-soft">{message}</p>}
      <Button className="mt-4" disabled={isPending || !endDate || !quote} onClick={submit}>{isPending ? "Sending…" : "Request booking"}</Button>
    </div>
  );
}
