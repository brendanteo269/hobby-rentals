"use client";

import { useState } from "react";
import { formatDate, toIsoDate } from "@/lib/format";
import { UNAVAILABLE_REASON_LABELS, WEEKDAY_LABELS, type UnavailableReason } from "@/lib/listings";

const LOCALE = "en-SG";

/** The day after an ISO date, built in local time so an evening never shifts it. */
export function nextDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1, day + 1));
}

/**
 * The unbroken run of bookable days starting at `startDate`.
 *
 * A rental occupies every date in its range, so a period can only be made of
 * consecutive available days: the first unavailable date ends the run, and
 * nothing past it can be selected as an end date.
 */
export function consecutiveDatesFrom(startDate: string, availableDates: Set<string>): string[] {
  const dates = [startDate];
  while (availableDates.has(nextDate(dates.at(-1)!))) dates.push(nextDate(dates.at(-1)!));
  return dates;
}

function monthOf(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month: month - 1 };
}

const ordinal = (value: { year: number; month: number }) => value.year * 12 + value.month;

type Props = {
  /** Every date the calendar may page across, ascending. */
  availableDates: string[];
  /**
   * The month to open on - the first date that can actually begin a valid
   * rental, so the calendar does not open on a month of disabled days.
   * Passed in rather than derived, because the selectable set narrows once a
   * start date is chosen and the view must not jump when it does.
   */
  anchorDate: string;
  /** Dates the caller will accept a click on right now. */
  selectableDates: string[];
  /** Why a date cannot be booked, for the ones that carry a reason. */
  reasonByDate: Map<string, UnavailableReason>;
  startDate: string;
  endDate: string;
  onPick: (day: string) => void;
  /**
   * Appended to a blocked day's tooltip and screen-reader label. A bundle
   * uses it to name the component responsible; a single listing has nothing
   * to add and leaves it out.
   */
  blockedBy?: (day: string) => string | undefined;
};

/**
 * The month grid shared by the listing and bundle booking flows (S2-08,
 * S2-20 Scenario 2).
 *
 * It renders and pages; it decides nothing. Which dates can be picked, and
 * what a pick means, belong to the form around it - the two differ (one
 * listing's limits versus every component's calendars at once) while the grid
 * itself does not.
 *
 * Returns null when there is nothing to show, so the caller owns the wording
 * of "no dates available" in its own context.
 */
export function AvailabilityCalendar({
  availableDates,
  anchorDate,
  selectableDates,
  reasonByDate,
  startDate,
  endDate,
  onPick,
  blockedBy,
}: Props) {
  const [paged, setPaged] = useState<{ year: number; month: number } | null>(null);

  const lastAvailable = availableDates.at(-1);
  if (!anchorDate || !lastAvailable) return null;

  const firstMonth = monthOf(anchorDate);
  const lastMonth = monthOf(lastAvailable);
  const month = (() => {
    if (!paged || ordinal(paged) < ordinal(firstMonth)) return firstMonth;
    if (ordinal(paged) > ordinal(lastMonth)) return lastMonth;
    return paged;
  })();

  // Monday-first, matching WEEKDAY_LABELS and the backend's weekday numbering.
  const lead = (new Date(month.year, month.month, 1).getDay() + 6) % 7;
  const length = new Date(month.year, month.month + 1, 0).getDate();
  const label = new Date(month.year, month.month, 1).toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
  const canGoBack = ordinal(month) > ordinal(firstMonth);
  const canGoForward = ordinal(month) < ordinal(lastMonth);

  return (
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
          const day = toIsoDate(new Date(month.year, month.month, index + 1));
          const selectable = selectableDates.includes(day);
          const selected = day === startDate || day === endDate;
          const inRange = Boolean(startDate && endDate && day > startDate && day < endDate);
          // Only a day the listing itself refuses carries a reason. One that
          // is merely unpickable right now - before the chosen start, or past
          // the maximum length - stays plainly dimmed, since nothing is wrong
          // with the date.
          const reason = selectable ? undefined : reasonByDate.get(day);
          const culprit = reason ? blockedBy?.(day) : undefined;
          const note = reason
            ? `${UNAVAILABLE_REASON_LABELS[reason]}${culprit ? ` — ${culprit}` : ""}`
            : undefined;
          // Struck through for a date someone holds - a booking, or a live
          // waitlist offer - and merely dimmed for one the listing never
          // offered. The first may free up; the second will not.
          const heldBySomeone = reason === "BOOKED" || reason === "WAITLIST_HOLD";
          const unavailableStyle = heldBySomeone
            ? "cursor-not-allowed text-ink-soft line-through"
            : "cursor-default text-ink-soft/30";
          return (
            <button
              key={day}
              type="button"
              disabled={!selectable}
              onClick={() => onPick(day)}
              aria-pressed={selected}
              aria-label={note ? `${formatDate(day)}, ${note.toLowerCase()}` : undefined}
              title={note}
              className={`aspect-square rounded-lg text-sm transition-colors ${selected ? "bg-ink text-white" : inRange ? "bg-surface-muted text-ink" : selectable ? "hover:bg-surface-muted" : unavailableStyle}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
