"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/listings";
import { formatDate } from "@/lib/format";

export type BlackoutDateDraft = { start_date: string; end_date: string; reason?: string };

const LOCALE = "en-SG";

/** Local calendar day as YYYY-MM-DD. Built from the parts rather than
 *  toISOString(), which would shift the date across the UTC boundary. */
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const shiftDay = (value: string, delta: number) => {
  const [year, month, day] = value.split("-").map(Number);
  return iso(new Date(year, month - 1, day + delta));
};

const monthOf = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return { year, month: month - 1 };
};

/**
 * Collapses the picked days into the ranges the API stores.
 *
 * An owner blocking a fortnight away drags across fourteen days; sending
 * fourteen single-day rules would be a faithful but useless record of the
 * dragging. Consecutive days become one range, which is what they meant.
 */
function toRanges(selected: string[]): BlackoutDateDraft[] {
  const ranges: BlackoutDateDraft[] = [];
  for (const day of [...selected].sort()) {
    const last = ranges.at(-1);
    if (last && shiftDay(last.end_date, 1) === day) last.end_date = day;
    else ranges.push({ start_date: day, end_date: day });
  }
  return ranges;
}

function describe(range: BlackoutDateDraft) {
  return range.start_date === range.end_date
    ? formatDate(range.start_date)
    : `${formatDate(range.start_date)} – ${formatDate(range.end_date)}`;
}

/**
 * One-off calendar exceptions, picked inside the listing's own window.
 *
 * Only days the listing is actually available can be blacked out: blocking a
 * date the item was never offered on is not a rule, and letting it be entered
 * would put a meaningless row in front of the backend to reject.
 */
export function BlackoutRulesField({
  availableFrom,
  availableUntil,
  weeklyDays,
  error,
}: {
  availableFrom: string;
  availableUntil: string;
  /** ISO weekdays (1 = Monday) the weekly schedule above currently offers. */
  weeklyDays: number[];
  error?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  // Anchor of an in-progress drag, plus the day the pointer is currently over.
  const [drag, setDrag] = useState<{ anchor: string; over: string; removing: boolean } | null>(null);
  const [paged, setPaged] = useState<{ year: number; month: number } | null>(null);

  // A day the weekly schedule never offers is already unavailable; blacking
  // it out would be a rule with nothing to switch off.
  const inWindow = useCallback(
    (day: string) => {
      if (!availableFrom || day < availableFrom) return false;
      if (availableUntil && day > availableUntil) return false;
      const [year, month, date] = day.split("-").map(Number);
      const weekday = new Date(year, month - 1, date).getDay();
      return weeklyDays.includes(weekday === 0 ? 7 : weekday);
    },
    [availableFrom, availableUntil, weeklyDays],
  );

  const commit = useCallback(() => {
    setDrag((pending) => {
      if (!pending) return null;
      setSelected((current) => {
        const [from, to] =
          pending.anchor <= pending.over
            ? [pending.anchor, pending.over]
            : [pending.over, pending.anchor];
        const span: string[] = [];
        for (let day = from; day <= to; day = shiftDay(day, 1)) {
          if (inWindow(day)) span.push(day);
        }
        return pending.removing
          ? current.filter((day) => !span.includes(day))
          : [...new Set([...current, ...span])];
      });
      return null;
    });
  }, [inWindow]);

  // The grid's own handler catches the ordinary release; this catches one that
  // happens off the grid, or before React has finished mounting this listener.
  useEffect(() => {
    if (!drag) return;
    window.addEventListener("pointerup", commit);
    return () => window.removeEventListener("pointerup", commit);
  }, [drag, commit]);

  // Narrowing the window strands days outside it. They are filtered here
  // rather than deleted, so widening the window again brings back what the
  // owner picked instead of silently having thrown it away.
  const live = useMemo(
    () => selected.filter((day) => inWindow(day)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, availableFrom, availableUntil, weeklyDays],
  );
  const ranges = useMemo(() => toRanges(live), [live]);

  if (!availableFrom) {
    return (
      <div>
        <span className="block text-sm font-medium">Blackout dates</span>
        <p className="body-copy mt-2">
          Choose an available-from date first — blackouts are picked from the days this listing is
          open for.
        </p>
      </div>
    );
  }

  // The month on screen is the one paged to, held inside the window rather
  // than tracked in an effect, so a change to either bound moves it for free.
  const floor = monthOf(availableFrom);
  const ceiling = availableUntil ? monthOf(availableUntil) : null;
  const ordinal = (value: { year: number; month: number }) => value.year * 12 + value.month;
  const month = (() => {
    if (!paged || ordinal(paged) < ordinal(floor)) return floor;
    if (ceiling && ordinal(paged) > ordinal(ceiling)) return ceiling;
    return paged;
  })();

  // Monday-first, matching how the weekly schedule above is laid out.
  const lead = (new Date(month.year, month.month, 1).getDay() + 6) % 7;
  const length = new Date(month.year, month.month + 1, 0).getDate();
  const label = new Date(month.year, month.month, 1).toLocaleDateString(LOCALE, {
    month: "long",
    year: "numeric",
  });

  const step = (delta: number) => {
    const moved = new Date(month.year, month.month + delta, 1);
    setPaged({ year: moved.getFullYear(), month: moved.getMonth() });
  };

  // Paging past the window would only ever show unselectable days.
  const firstOfMonth = iso(new Date(month.year, month.month, 1));
  const lastOfMonth = iso(new Date(month.year, month.month + 1, 0));
  const canGoBack = firstOfMonth > availableFrom;
  const canGoForward = !availableUntil || lastOfMonth < availableUntil;

  const inDrag = (day: string) => {
    if (!drag) return false;
    const [from, to] = drag.anchor <= drag.over ? [drag.anchor, drag.over] : [drag.over, drag.anchor];
    return day >= from && day <= to;
  };

  return (
    <div>
      <span className="block text-sm font-medium">Blackout dates</span>
      <p className="body-copy mt-2">
        Optional. Click a day the item cannot be rented, or drag across several. Only days your
        weekly schedule already offers, inside your availability window, can be picked.
      </p>

      <input type="hidden" name="initial_blackouts" value={JSON.stringify(ranges)} />

      <div className="mt-4 max-w-sm rounded-2xl border border-line select-none">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="rounded-full px-2 py-1 text-sm text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ‹
          </button>
          <span className="text-sm font-medium">{label}</span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={!canGoForward}
            aria-label="Next month"
            className="rounded-full px-2 py-1 text-sm text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 p-3" onPointerUp={commit}>
          {WEEKDAY_LABELS.map((day) => (
            <span key={day} className="pb-1 text-center text-[0.6875rem] text-ink-soft">
              {day.charAt(0)}
            </span>
          ))}

          {Array.from({ length: lead }, (_, index) => (
            <span key={`lead-${index}`} />
          ))}

          {Array.from({ length }, (_, index) => {
            const day = iso(new Date(month.year, month.month, index + 1));
            const selectable = inWindow(day);
            const dragging = inDrag(day);
            const isSelected = dragging && drag ? !drag.removing : live.includes(day);

            return (
              <button
                key={day}
                type="button"
                disabled={!selectable}
                aria-pressed={isSelected}
                onPointerDown={(event) => {
                  if (!selectable) return;
                  // Keeps the browser from turning the drag into a text or
                  // element selection halfway across the grid.
                  event.preventDefault();
                  setDrag({ anchor: day, over: day, removing: live.includes(day) });
                }}
                onPointerEnter={() => {
                  if (selectable && drag) setDrag({ ...drag, over: day });
                }}
                className={`aspect-square rounded-lg text-sm transition-colors ${
                  isSelected
                    ? "bg-ink text-white"
                    : selectable
                      ? "hover:bg-surface-muted"
                      : "cursor-default text-ink-soft/30"
                } ${dragging && !isSelected ? "bg-surface-muted" : ""}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {ranges.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {ranges.map((range) => (
            <li
              key={range.start_date}
              className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm"
            >
              <span>{describe(range)}</span>
              <button
                type="button"
                aria-label={`Remove ${describe(range)}`}
                className="text-ink-soft underline transition-colors hover:text-ink"
                onClick={() =>
                  setSelected((current) =>
                    current.filter((day) => day < range.start_date || day > range.end_date),
                  )
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-accent-dark">
          {error}
        </p>
      )}
    </div>
  );
}
