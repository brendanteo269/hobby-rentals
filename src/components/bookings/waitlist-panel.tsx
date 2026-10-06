"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  AvailabilityCalendar,
  consecutiveDatesFrom,
} from "@/components/bookings/availability-calendar";
import { BookingQuoteSummary } from "@/components/bookings/booking-quote-summary";
import { DamageProtectionField } from "@/components/bookings/damage-protection-field";
import { joinListingWaitlist, leaveListingWaitlist } from "@/app/waitlist/actions";
import { quoteBooking, requestBooking } from "@/app/bookings/actions";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { hasLiveOffer, isOpen, waitlistDays, type WaitlistEntry } from "@/lib/waitlist";
import type { BookingQuote } from "@/lib/bookings";
import type { UnavailableDate } from "@/lib/listings";

/**
 * S2-15: queueing for dates another renter currently holds.
 *
 * A separate panel below the booking form rather than a mode inside it: the
 * two answer different questions ("can I have these dates" against "tell me
 * if these dates free up"), and the booking calendar deliberately refuses to
 * select a booked day. This renders its own calendar over exactly the days
 * the booking one struck through, which is why AvailabilityCalendar takes the
 * selectable set as a prop rather than working it out itself.
 *
 * Only dates held by a booking can be queued for. A day the owner blacked
 * out, or never offered, will not free up when a booking ends, so the backend
 * refuses it and it is not offered here either.
 *
 * A renter holding a live offer can book straight from their row here, as
 * well as by picking the dates again in the booking form above. The two reach
 * the same place; this one just saves re-selecting dates the renter has
 * already been promised, which is also the moment they are least inclined to
 * hunt for them.
 */
export function WaitlistPanel({
  listingId,
  unavailableDates,
  entries,
}: {
  listingId: string;
  /** From the booking availability; the ones somebody holds can be queued for. */
  unavailableDates: UnavailableDate[];
  /** The caller's existing places in this listing's queue. */
  entries: WaitlistEntry[];
}) {
  // Dates somebody else is holding, which is what there is to queue behind:
  // a confirmed booking, or another renter's live 24-hour waitlist offer.
  // The second matters - once the booking blocking a date is cancelled the
  // date stops being BOOKED, and leaving it out here would strand anyone
  // arriving while the first person in the queue decides.
  const bookedDates = useMemo(
    () =>
      unavailableDates
        .filter((entry) => entry.reason === "BOOKED" || entry.reason === "WAITLIST_HOLD")
        .map((entry) => entry.date)
        .sort(),
    [unavailableDates],
  );
  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);

  // Only the rows this panel has itself changed are held locally; the rest
  // come straight from props, so an offer arriving after the page rendered
  // shows up rather than being frozen out by stale state.
  const [changed, setChanged] = useState<Record<string, WaitlistEntry>>({});
  const myEntries = entries.map((entry) => changed[entry.id] ?? entry);
  // Plus anything joined in this session, which props do not know about yet.
  const [added, setAdded] = useState<WaitlistEntry[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A queue place covers one unbroken run of booked days: the dates free up
  // together when the booking holding them is cancelled.
  const endDates = useMemo(
    () => (startDate ? consecutiveDatesFrom(startDate, bookedSet) : []),
    [bookedSet, startDate],
  );
  const choosingEnd = Boolean(startDate && !endDate);
  const open = [...added.map((entry) => changed[entry.id] ?? entry), ...myEntries]
    .filter((entry, index, all) => all.findIndex((other) => other.id === entry.id) === index)
    .filter(isOpen);

  // The offer the renter is part-way through booking: its priced quote, and
  // the key that makes a retry of that same attempt safe. Held per entry, so
  // only the row being booked expands.
  const [booking, setBooking] = useState<{ entryId: string; quote: BookingQuote; key: string } | null>(null);
  // S2-09: the same choice the booking form offers, since this reaches the
  // same place. Re-quoted on toggle so the total is always the server's.
  const [damageProtection, setDamageProtection] = useState(false);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [shortfallCents, setShortfallCents] = useState<number | undefined>();

  function clearOutcome() {
    setMessage(null);
    setError(null);
    setErrorCode(undefined);
    setShortfallCents(undefined);
  }

  /** Prices the offered dates, so the renter sees the cost before committing. */
  function priceOffer(entry: WaitlistEntry) {
    clearOutcome();
    setBooking(null);
    startTransition(async () => {
      const result = await quoteBooking(listingId, entry.start_date, entry.end_date, damageProtection);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setBooking({ entryId: entry.id, quote: result.quote, key: crypto.randomUUID() });
    });
  }

  function toggleProtection(entry: WaitlistEntry, selected: boolean) {
    setDamageProtection(selected);
    clearOutcome();
    startTransition(async () => {
      const result = await quoteBooking(listingId, entry.start_date, entry.end_date, selected);
      if ("error" in result) setError(result.error);
      else setBooking({ entryId: entry.id, quote: result.quote, key: crypto.randomUUID() });
    });
  }

  function confirmOffer(entry: WaitlistEntry) {
    if (!booking || booking.entryId !== entry.id) return;
    clearOutcome();
    startTransition(async () => {
      const result = await requestBooking(listingId, entry.start_date, entry.end_date, booking.key, damageProtection);
      if ("error" in result) {
        setError(result.error);
        setErrorCode(result.code);
        setShortfallCents(result.shortfallCents);
        return;
      }
      // The database closes the entry as BOOKED when the booking lands; this
      // mirrors that so the row leaves the queue without waiting for a reload.
      setChanged((current) => ({ ...current, [entry.id]: { ...entry, status: "BOOKED" } }));
      setBooking(null);
      setMessage(
        `Request sent for ${formatDate(entry.start_date)} – ${formatDate(entry.end_date)}. ` +
          "It is with the owner now.",
      );
    });
  }

  function pick(day: string) {
    clearOutcome();
    if (!startDate || endDate) {
      setStartDate(day);
      setEndDate("");
    } else if (endDates.includes(day)) {
      setEndDate(day);
    }
  }

  function join() {
    if (!startDate) return;
    const until = endDate || startDate;
    clearOutcome();
    startTransition(async () => {
      const result = await joinListingWaitlist(listingId, startDate, until);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAdded((current) => [result.entry, ...current]);
      setStartDate("");
      setEndDate("");
      // Scenario 1: confirm to the renter that they have been added.
      setMessage(
        `You are on the waitlist for ${formatDate(result.entry.start_date)} – ${formatDate(result.entry.end_date)}. ` +
          "We will tell you if those dates free up.",
      );
    });
  }

  function leave(entryId: string) {
    clearOutcome();
    startTransition(async () => {
      const result = await leaveListingWaitlist(entryId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setChanged((current) => ({ ...current, [result.entry.id]: result.entry }));
      setMessage("You have left the waitlist for those dates.");
    });
  }

  if (bookedDates.length === 0 && open.length === 0) return null;

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="text-base font-semibold uppercase tracking-wide">Waitlist</h2>

      {open.length > 0 && (
        <ul className="mt-4 space-y-2">
          {open.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-lg border p-3 text-sm ${
                hasLiveOffer(entry) ? "border-accent bg-accent-soft" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {formatDate(entry.start_date)} – {formatDate(entry.end_date)}{" "}
                  <span className="text-ink-soft">
                    · {waitlistDays(entry)} {waitlistDays(entry) === 1 ? "day" : "days"}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {hasLiveOffer(entry) && booking?.entryId !== entry.id && (
                    <Button
                      className="px-3 py-1.5 text-xs"
                      disabled={isPending}
                      onClick={() => priceOffer(entry)}
                    >
                      {isPending ? "Checking…" : "Book these dates"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                    disabled={isPending}
                    onClick={() => leave(entry.id)}
                  >
                    Leave waitlist
                  </Button>
                </span>
              </div>
              <p className="body-copy mt-1">
                {hasLiveOffer(entry) ? (
                  <>
                    These dates are free and held for you alone until{" "}
                    {formatDateTime(entry.offer_expires_at!)}. Book them here, or pick them again in
                    the calendar above — after that they pass to the next person waiting.
                  </>
                ) : (
                  "Waiting. If the booking holding these dates is cancelled, you get first refusal for 24 hours."
                )}
              </p>

              {/* The price before committing: a renter should never place a
                  wallet hold without having seen what it is for. Same
                  breakdown the booking form shows, from the same component. */}
              {booking?.entryId === entry.id && (
                <div className="mt-2">
                  <DamageProtectionField
                    offer={booking.quote.damage_protection}
                    onChange={(selected) => toggleProtection(entry, selected)}
                    disabled={isPending}
                  />
                  <BookingQuoteSummary quote={booking.quote} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      className="px-3 py-1.5 text-xs"
                      disabled={isPending}
                      onClick={() => confirmOffer(entry)}
                    >
                      {isPending ? "Sending…" : "Request booking"}
                    </Button>
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      disabled={isPending}
                      onClick={() => setBooking(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {bookedDates.length > 0 && (
        <>
          <p className="body-copy mt-4">
            Want dates someone else has? Pick a start date, then an end date, from the struck-through
            days, and we will tell you if they free up. Nothing is charged or held for joining.
          </p>

          <AvailabilityCalendar
            availableDates={bookedDates}
            anchorDate={bookedDates[0]}
            selectableDates={choosingEnd ? endDates : bookedDates}
            reasonByDate={new Map()}
            startDate={startDate}
            endDate={endDate}
            onPick={pick}
          />

          <p className="mt-3 text-sm text-ink-soft">
            {startDate ? `From: ${formatDate(startDate)}` : "Choose a start date from the held days."}
            {endDate
              ? ` · Until: ${formatDate(endDate)}`
              : startDate
                ? " · Choose an end date, or join for the single day."
                : ""}
          </p>

          <Button className="mt-4" disabled={isPending || !startDate} onClick={join}>
            {isPending ? "Joining…" : "Join waitlist"}
          </Button>
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
      {message && (
        <p role="status" className="mt-3 text-sm text-ink-soft">
          {message}
        </p>
      )}
    </div>
  );
}
