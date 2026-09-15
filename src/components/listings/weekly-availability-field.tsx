"use client";

import { useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/listings";

/**
 * Which weekdays the item can be handed over on.
 *
 * The seven days are always on screen, in both modes: an owner deciding
 * whether the profile default is good enough should not have to switch to
 * custom to find out what the default actually is. In default mode they are
 * shown dimmed and inert, which reads as "this is what you would get" rather
 * than as a control that has stopped working.
 */
export function WeeklyAvailabilityField({ profileAvailableDays }: { profileAvailableDays: number[] }) {
  const [custom, setCustom] = useState(false);
  // A custom schedule starts from the owner's current default. This makes
  // switching modes predictable instead of silently reverting to Mon–Fri.
  const [days, setDays] = useState<number[]>(profileAvailableDays);
  const shown = custom ? days : profileAvailableDays;

  const toggle = (day: number) =>
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );

  return (
    <div>
      <span className="block text-sm font-medium">Weekly rental availability</span>
      <p className="body-copy mt-2">The days of the week this item can be collected and returned.</p>

      <input type="hidden" name="has_custom_availability" value={String(custom)} />
      <input type="hidden" name="custom_available_days" value={JSON.stringify(days)} />

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="availability_mode"
            className="accent-ink"
            checked={!custom}
            onChange={() => setCustom(false)}
          />
          Use my profile default
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="availability_mode"
            className="accent-ink"
            checked={custom}
            onChange={() => setCustom(true)}
          />
          Set a custom schedule for this listing
        </label>
      </div>

      <div
        role="group"
        aria-label="Days available"
        className={`mt-4 flex flex-wrap gap-2 ${custom ? "" : "opacity-55"}`}
      >
        {WEEKDAY_LABELS.map((label, index) => {
          const day = index + 1;
          const selected = shown.includes(day);
          return (
            <button
              key={label}
              type="button"
              disabled={!custom}
              aria-pressed={selected}
              onClick={() => toggle(day)}
              className={`rounded-sm border px-3 py-2 text-sm transition-colors ${
                selected ? "border-ink bg-sand" : "border-line text-ink-soft"
              } ${custom ? "hover:border-ink" : "cursor-default"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {custom && days.length === 0 && (
        <p role="alert" className="mt-3 text-xs text-clay">
          Pick at least one day, or switch back to your profile default.
        </p>
      )}
    </div>
  );
}
