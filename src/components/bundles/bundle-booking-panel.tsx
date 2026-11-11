"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  AvailabilityCalendar,
  consecutiveDatesFrom,
  nextDate,
} from "@/components/bookings/availability-calendar";
import { BookingQuoteRow, BookingQuoteSummary } from "@/components/bookings/booking-quote-summary";
import { quoteBundleBooking, requestBundleBooking } from "@/app/bookings/actions";
import { BackupListingCard } from "@/components/bundles/backup-listing-card";
import { backupLimitAlong, backupUseByDay, deductionLabel, omittedIds, rangeIsBookable, substitutionLine } from "@/lib/bundle-items";
import { formatDate, formatMoney } from "@/lib/format";
import { rentalDurationLimits, UNAVAILABLE_REASON_LABELS } from "@/lib/listings";
import type { BundleAlternative, BundleAvailability, BundleQuote } from "@/lib/bundles";

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
  optionalItems,
  backupsByItem = {},
}: {
  bundleId: string;
  availability: BundleAvailability;
  minRentalDays: number | null;
  maxRentalDays: number | null;
  /** S5-10: the items the renter may leave out, each ticked until they say otherwise. */
  optionalItems: { id: string; name: string; deduction_cents: number }[];
  /** S5-10: each required item's backup, by the item's id, to show when the dates need it. */
  backupsByItem?: Record<string, BundleAlternative>;
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
  // S5-10: the calendar above judges each day alone, but an item or its backup is booked for the whole
  // range. A run of free days can therefore include ranges nobody can book - the item free early in it,
  // only the backup free later - and those end dates are not offered.
  const backups = useMemo(() => availability.backups ?? [], [availability.backups]);
  const endDatesFrom = useCallback(
    (start: string) => {
      const maximum = maxRentalDays ?? Infinity;
      const run = consecutiveDatesFrom(start, availableSet);
      return run.filter(
        (_, index) => index + 1 >= minDays && index + 1 <= maximum && rangeIsBookable(backups, run.slice(0, index + 1)),
      );
    },
    [availableSet, backups, maxRentalDays, minDays],
  );
  const startDates = useMemo(
    () => availableDates.filter((date) => endDatesFrom(date).length > 0),
    [availableDates, endDatesFrom],
  );
  // The calendar's colours: orange where a day stands in a backup, green where nothing does.
  const backupUse = useMemo(() => backupUseByDay(backups, availableDates), [backups, availableDates]);
  const dayTone = useCallback(
    (day: string) => {
      const uses = backupUse.get(day);
      return uses ? { tone: "backup" as const, note: `Uses ${uses.join(", ")}` } : { tone: "ok" as const };
    },
    [backupUse],
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
  // Two transitions, not one: pricing a range and sending the request are different waits, and one
  // shared flag made the button read "Sending…" while a price was only being checked, telling the
  // renter a request was on its way when nothing had been sent.
  const [isPricing, startPricing] = useTransition();
  const [isSending, startSending] = useTransition();
  const isPending = isPricing || isSending;
  // Optional items the renter has unticked; every one is ticked to begin with.
  const [unticked, setUntickedIds] = useState<ReadonlySet<string>>(new Set());

  const endDates = useMemo(() => (startDate ? endDatesFrom(startDate) : []), [endDatesFrom, startDate]);

  // Where the free days run on but a backup rule cuts the offered ranges short: the first day a rental
  // from here can no longer reach, and the item that cannot be covered whole. Said under the calendar,
  // so a renter is not left wondering why a day that looks free cannot be chosen as the end.
  const backupLimit = useMemo(
    () => (startDate && !endDate ? backupLimitAlong(backups, consecutiveDatesFrom(startDate, availableSet)) : null),
    [startDate, endDate, availableSet, backups],
  );

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
      requote(startDate, day, unticked);
    }
  }

  /** Prices the range with the optional items as ticked, and takes a fresh key for what is now being asked. */
  function requote(start: string, end: string, omitted: ReadonlySet<string>) {
    setQuote(null);
    setIdempotencyKey(null);
    startPricing(async () => {
      const result = await quoteBundleBooking(bundleId, start, end, optionalItems.filter((item) => omitted.has(item.id)).map((item) => item.id));
      if ("error" in result) setError(result.error);
      else {
        setQuote(result.quote);
        setIdempotencyKey(crypto.randomUUID());
      }
    });
  }

  /** S5-10 Scenario 3: ticking or unticking an optional item re-prices the bundle at once. */
  function toggleOptional(listingId: string, ticked: boolean) {
    clearOutcome();
    const next = new Set(unticked);
    if (ticked) next.delete(listingId);
    else next.add(listingId);
    setUntickedIds(next);
    if (startDate && endDate) requote(startDate, endDate, next);
  }

  function submit() {
    if (!startDate || !endDate || !idempotencyKey) return;
    clearOutcome();
    startSending(async () => {
      const result = await requestBundleBooking(bundleId, startDate, endDate, idempotencyKey, omittedIds(quote, unticked));
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
        dayTone={backups.length > 0 ? dayTone : undefined}
      />

      <p className="mt-3 text-sm text-ink-soft">
        {startDate ? `From: ${formatDate(startDate)}` : "Choose a start date."}
        {endDate ? ` · Until: ${formatDate(endDate)}` : startDate ? " · Choose an end date." : ""}
      </p>

      {backups.length > 0 && (
        <div className="mt-2 text-xs text-ink-soft">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-success-soft ring-1 ring-success/40" aria-hidden="true" />
              Everything is available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-warning-soft ring-1 ring-warning/40" aria-hidden="true" />
              A backup is used (hover for which)
            </span>
          </p>
        </div>
      )}

      {runBlocker && (
        <p className="mt-2 text-sm text-ink-soft">
          Bookable through {formatDate(runBlocker.lastInRun)} — {formatDate(runBlocker.blocked)} is{" "}
          {UNAVAILABLE_REASON_LABELS[runBlocker.reason].toLowerCase()}
          {runBlocker.who ? ` (${runBlocker.who})` : ""}.
        </p>
      )}

      {backupLimit && (
        <p className="mt-2 text-sm text-ink-soft">
          From {formatDate(startDate)} you can book through {formatDate(backupLimit.lastOk)}.{" "}
          {backupLimit.short.item_name} and its backup, {backupLimit.short.backup_name}, are each free for part of
          the stretch after that, but one of them has to cover the whole rental.
        </p>
      )}

      {optionalItems.length > 0 && (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">Optional extras</legend>
          <p className="body-copy mt-1">Untick anything you do not need. It comes off the price and is not booked.</p>
          <ul className="mt-2 space-y-2">
            {optionalItems.map((item) => {
              // Not free for the chosen dates: left out by itself, and the bundle is still offered.
              const unavailable = quote?.optional_items.find((entry) => entry.listing_id === item.id)?.available === false;
              const included = !unavailable && !unticked.has(item.id);
              return (
                <li key={item.id}>
                  <label
                    className={`flex min-h-12 items-center gap-3 rounded-lg border-2 p-3 text-sm ${
                      unavailable
                        ? "border-line text-ink-soft"
                        : included
                          ? "cursor-pointer border-ink bg-surface-muted"
                          : "cursor-pointer border-dashed border-accent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={included}
                      disabled={unavailable || isPending}
                      onChange={(event) => toggleOptional(item.id, event.target.checked)}
                      className="size-5 shrink-0 accent-ink"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{item.name}</span>
                      <span className="block text-xs text-ink-soft">
                        {unavailable
                          ? "Not free for these dates, so it is not included."
                          : included
                            ? "Included"
                            : "Left out, not booked"}
                      </span>
                    </span>
                    {!unavailable && (
                      <span className="shrink-0 text-xs font-semibold text-accent-dark">{deductionLabel(item.deduction_cents)} if skipped</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {quote && quote.substitutions.length > 0 && (
        // S5-10 Scenario 4: a backup stands in where an item is out for the dates.
        <ul className="mt-3 space-y-1 text-sm">
          {quote.substitutions.map((swap) => {
            const backup = backupsByItem[swap.item_id];
            // The listing itself when we have it, so the renter can look and decide; the line alone otherwise.
            return backup ? (
              <li key={swap.item_id}>
                <BackupListingCard itemName={swap.item_name} backup={backup} />
              </li>
            ) : (
              <li key={swap.item_id}>{substitutionLine(swap)}</li>
            );
          })}
        </ul>
      )}

      {quote && (
        <BookingQuoteSummary
          quote={quote}
          subject="bundle"
          extra={
            <>
              {quote.deduction_cents > 0 && (
                <BookingQuoteRow label={`Without ${quote.omitted_items.map((item) => item.name).join(", ")}`}>
                  −{formatMoney(quote.deduction_cents)}
                </BookingQuoteRow>
              )}
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
        {isSending ? "Sending…" : isPricing ? "Checking price…" : "Request booking"}
      </Button>
    </div>
  );
}
