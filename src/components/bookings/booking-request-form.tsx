"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button, Notice } from "@/components/ui";
import {
  AvailabilityCalendar,
  consecutiveDatesFrom,
  nextDate,
} from "@/components/bookings/availability-calendar";
import { BookingQuoteSummary } from "@/components/bookings/booking-quote-summary";
import { DamageProtectionField } from "@/components/bookings/damage-protection-field";
import { quoteBooking, requestBooking } from "@/app/bookings/actions";
import type { BookingQuote } from "@/lib/api/bookings";
import type { Booking } from "@/lib/bookings";
import { formatDate, formatMoney } from "@/lib/format";
import { RENTALS_PATH } from "@/lib/routes";
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
  /**
   * S3-18: what the renter owes in overdue return fees, if anything. A
   * paused account cannot book, so this is said before they pick dates
   * rather than after they submit - and before they top up a wallet that
   * was never the problem.
   */
  overdueDebtCents?: number;
  /**
   * Dates to open on, from a link that already knows them - a gear request's
   * offer (S5-13) or an availability alert (S4-07). Honoured only when they
   * are genuinely bookable: a link can be stale, and a range silently
   * pre-filled over days that have since gone would be refused on submit.
   */
  initialStartDate?: string;
  initialEndDate?: string;
  /** S5-11: whether this listing takes instant bookings at all... */
  instantBook?: boolean;
  /** ...and whether this renter is one of the ones it takes them from. */
  instantBookEligible?: boolean;
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
  overdueDebtCents = 0,
  initialStartDate,
  initialEndDate,
  instantBook = false,
  instantBookEligible = false,
}: Props) {
  const paused = overdueDebtCents > 0;
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const reasonByDate = useMemo(
    () => new Map(unavailableDates.map((entry) => [entry.date, entry.reason])),
    [unavailableDates],
  );
  // Days somebody else holds - a booking, or a live waitlist offer - which
  // the calendar strikes through and the waitlist panel below offers to
  // queue for.
  const hasHeldDays = useMemo(
    () => unavailableDates.some((entry) => entry.reason === "BOOKED" || entry.reason === "WAITLIST_HOLD"),
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
  /**
   * Dates that arrived in the link, reconciled with what this listing can
   * actually sell.
   *
   * A link carries what the renter asked for somewhere else - a gear request
   * (S5-13), an availability alert (S4-07) - and this listing may not be
   * able to honour all of it: the range can be longer than the listing
   * rents for, or part of it can have been booked since. Taking as much as
   * holds and SAYING what did not is the point. Refusing it silently leaves
   * the renter on an empty calendar that looks like a broken link, which is
   * how this first shipped.
   */
  const linked = useMemo(() => {
    if (!initialStartDate || !initialEndDate) return null;
    if (!startDates.includes(initialStartDate)) {
      return { start: "", end: "", note: "Those dates are no longer free on this listing. Pick from what is left." };
    }
    const run = consecutiveDatesFrom(initialStartDate, availableSet);
    const length = run.indexOf(initialEndDate) + 1;
    if (length >= minDays && (maxRentalDays == null || length <= maxRentalDays)) {
      return { start: initialStartDate, end: initialEndDate, note: null };
    }
    // The start holds even when the whole range does not, so the renter
    // carries on from where they were rather than starting over.
    const because =
      length === 0
        ? "some of those days are taken"
        : maxRentalDays != null && length > maxRentalDays
          ? `this listing rents for at most ${maxRentalDays} days and you asked for ${length}`
          : `this listing rents for at least ${minDays} days`;
    return {
      start: initialStartDate,
      end: "",
      note: `Your start date is set, but ${because}. Choose an end date.`,
    };
  }, [initialStartDate, initialEndDate, startDates, availableSet, minDays, maxRentalDays]);

  const [startDate, setStartDate] = useState(linked?.start ?? "");
  const [endDate, setEndDate] = useState(linked?.end ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [shortfallCents, setShortfallCents] = useState<number | undefined>();
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  // S2-09. Kept here rather than read off the quote so the renter's choice
  // survives re-picking dates, and so toggling it can re-price immediately.
  const [damageProtection, setDamageProtection] = useState(false);
  // Generated once per quoted date range and reused across retries of
  // submitting it (e.g. a request that times out but actually succeeds
  // server-side), so a double-submit places only one wallet hold. A new
  // range gets its own key the next time a quote comes back.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  // Two transitions, not one: re-pricing and submitting are different waits,
  // and sharing a flag made the submit button read "Sending…" while it was
  // only fetching a quote - telling the renter their request was on its way
  // when nothing had been sent.
  const [isPricing, startPricing] = useTransition();
  const [isSending, startSending] = useTransition();
  const isPending = isPricing || isSending;
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

  /**
   * Prices a range on the server and takes a fresh idempotency key for it.
   *
   * The one place that quotes, because three things need to: picking an end
   * date, toggling damage protection, and arriving on a link that already
   * carries the dates. A range with no quote cannot be submitted, so a
   * fourth copy of this is a fourth chance to forget the key.
   */
  const priceRange = useCallback(
    (start: string, end: string, protection: boolean) => {
      setQuote(null);
      setIdempotencyKey(null);
      startPricing(async () => {
        const result = await quoteBooking(listingId, start, end, protection);
        if ("error" in result) setError(result.error);
        else {
          setQuote(result.quote);
          setIdempotencyKey(crypto.randomUUID());
        }
      });
    },
    [listingId, startPricing],
  );

  // A range that arrived in the URL was never picked, so nothing has priced
  // it. Priced once: a failed quote leaves the dates on screen with their
  // error rather than retrying forever.
  const pricedFromLink = useRef(false);
  useEffect(() => {
    if (!linked?.end || pricedFromLink.current) return;
    pricedFromLink.current = true;
    priceRange(linked.start, linked.end, damageProtection);
  }, [linked, damageProtection, priceRange]);

  /** Clears whatever the last attempt said, so a new one starts clean. */
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
      priceRange(startDate, day, damageProtection);
    }
  }

  /**
   * S2-09 Scenario 2: the total is recalculated before confirmation, by the
   * server rather than here - a fee the renter is shown must be the fee they
   * are charged. A new key with it, since the amount to hold has changed.
   */
  function toggleProtection(selected: boolean) {
    setDamageProtection(selected);
    if (!startDate || !endDate) return;
    clearOutcome();
    priceRange(startDate, endDate, selected);
  }

  function submit() {
    if (!startDate || !endDate || !idempotencyKey) return;
    clearOutcome();
    startSending(async () => {
      const result = await requestBooking(listingId, startDate, endDate, idempotencyKey, damageProtection);
      if ("error" in result) {
        setError(result.error);
        setErrorCode(result.code);
        setShortfallCents(result.shortfallCents);
      }
      else {
        const held = result.booking.total_amount_cents;
        // S5-11 Scenario 2: an Instant Book listing confirms on the spot, so
        // the renter must not be told to wait for an answer that is not
        // coming. The status the API returns is what decides - whether the
        // renter qualified is settled in the database, not here.
        const confirmed = result.booking.status === "CONFIRMED";
        const dates = `${formatDate(startDate)} – ${formatDate(endDate)}`;
        setMessage(
          confirmed
            ? `Booked for ${dates}. Confirmed straight away — this owner lets Trusted Renters skip the approval step.` +
                (held ? ` ${formatMoney(held)} is held in your wallet.` : "") +
                " Arrange the handover from your bookings."
            : `Request sent for ${dates}.` +
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
      {/* S5-11 Scenario 2 and 3, said before the renter commits rather than
          after: what pressing the button will actually do. A renter who does
          not qualify is told the ordinary thing happens, not that they fell
          short - the badge is explained on their profile, not here. */}
      {instantBook && (
        <p className="mt-3 text-sm font-medium text-ink">
          {instantBookEligible
            ? "You hold the Trusted Renter badge, so these dates are yours as soon as you book."
            : "This owner lets Trusted Renters book instantly. As you are not a trusted renter yet, yours goes to them as a request to review."}
        </p>
      )}

      <p className="body-copy mt-1">
        Select an available start date, then an available end date.
        {durationLimits && ` This listing rents for ${durationLimits}.`}
        {hasHeldDays && " Struck-through days are taken — you can join the waitlist for them below."}
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

      {/* Why the link did not fill in everything it carried. Shown until the
          renter has picked a full range of their own, at which point it is
          answered. */}
      {linked?.note && !endDate && (
        <p className="mt-2 text-sm text-ink">{linked.note}</p>
      )}

      {runBlocker && (
        <p className="mt-2 text-sm text-ink-soft">
          Bookable through {formatDate(runBlocker.lastInRun)} —{" "}
          {formatDate(runBlocker.blocked)} is{" "}
          {UNAVAILABLE_REASON_LABELS[runBlocker.reason].toLowerCase()}.
        </p>
      )}

      {quote && (
        <>
          <DamageProtectionField
            offer={quote.damage_protection}
            onChange={toggleProtection}
            disabled={isPending}
          />
          <BookingQuoteSummary quote={quote} />
        </>
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
      {message && <p role="status" className="mt-3 text-sm text-ink-soft">{message}</p>}
      {paused && (
        <Notice className="mt-3">
          <span className="font-medium">New bookings are paused on your account.</span>{" "}
          You owe {formatMoney(overdueDebtCents)} in overdue return fees.{" "}
          <Link href={RENTALS_PATH} className="underline underline-offset-4">
            Settle them to book again
          </Link>
          .
        </Notice>
      )}
      <div className={`mt-4 flex flex-wrap items-center gap-3 ${hideHeading ? "justify-end" : ""}`}>
        <Button disabled={paused || isPending || !endDate || !quote} onClick={submit}>{isSending ? "Sending…" : "Request booking"}</Button>
        {secondaryAction}
      </div>
    </div>
  );
}
