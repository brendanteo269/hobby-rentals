"use client";

import { useMemo, useState } from "react";
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

/**
 * Collapses the picked days into the ranges the API stores.
 *
 * An owner blocking a fortnight away clicks fourteen days; sending fourteen
 * single-day rules would be a faithful but useless record of the clicking.
 * Consecutive days become one range, which is what the owner meant.
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

/** One-off calendar exceptions only. Weekly availability is set separately. */
export function BlackoutRulesField({ error }: { error?: string }) {
  const today = useMemo(() => new Date(), []);
  const todayIso = iso(today);
  const [month, setMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string[]>([]);

  const ranges = useMemo(() => toRanges(selected), [selected]);

  // Monday-first, matching how the weekly schedule above is laid out.
  const lead = (new Date(month.year, month.month, 1).getDay() + 6) % 7;
  const length = new Date(month.year, month.month + 1, 0).getDate();
  const label = new Date(month.year, month.month, 1).toLocaleDateString(LOCALE, {
    month: "long",
    year: "numeric",
  });

  const step = (delta: number) =>
    setMonth((current) => {
      const moved = new Date(current.year, current.month + delta, 1);
      return { year: moved.getFullYear(), month: moved.getMonth() };
    });

  const toggle = (day: string) =>
    setSelected((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );

  return (
    <div>
      <span className="block text-sm font-medium">Blackout dates</span>
      <p className="body-copy mt-2">
        Optional. Click any day the item cannot be rented — a holiday, or a maintenance window.
      </p>

      <input type="hidden" name="initial_blackouts" value={JSON.stringify(ranges)} />

      <div className="mt-4 max-w-sm rounded-sm border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous month"
            className="rounded-sm px-2 py-1 text-sm text-ink-soft transition-colors hover:bg-sand hover:text-ink"
          >
            ‹
          </button>
          <span className="text-sm font-medium">{label}</span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next month"
            className="rounded-sm px-2 py-1 text-sm text-ink-soft transition-colors hover:bg-sand hover:text-ink"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 p-3">
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
            const isSelected = selected.includes(day);
            const isPast = day < todayIso;
            return (
              <button
                key={day}
                type="button"
                disabled={isPast}
                aria-pressed={isSelected}
                onClick={() => toggle(day)}
                className={`aspect-square rounded-sm text-sm transition-colors ${
                  isSelected
                    ? "bg-ink text-cream"
                    : isPast
                      ? "cursor-default text-ink-soft/40"
                      : "hover:bg-sand"
                } ${day === todayIso && !isSelected ? "border border-clay" : ""}`}
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
              className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm"
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
        <p role="alert" className="mt-3 text-xs text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
