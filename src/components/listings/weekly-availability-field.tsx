"use client";

import { Chip } from "@/components/ui";
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
export function WeeklyAvailabilityField({
  profileAvailableDays,
  custom,
  onCustomChange,
  days,
  onDaysChange,
}: {
  profileAvailableDays: number[];
  custom: boolean;
  onCustomChange: (custom: boolean) => void;
  days: number[];
  onDaysChange: (days: number[]) => void;
}) {
  const shown = custom ? days : profileAvailableDays;

  const toggle = (day: number) =>
    onDaysChange(
      days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort(),
    );

  return (
    <div>
      <span className="block text-sm font-medium">Weekly rental availability</span>
      <p className="body-copy mt-2">
        The days of the week this item can be collected and returned. Green days are available;
        outlined days are unavailable.
      </p>

      <input type="hidden" name="has_custom_availability" value={String(custom)} />
      <input type="hidden" name="custom_available_days" value={JSON.stringify(days)} />

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="availability_mode"
            className="accent-ink"
            checked={!custom}
            onChange={() => onCustomChange(false)}
          />
          Use my profile default
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="availability_mode"
            className="accent-ink"
            checked={custom}
            onChange={() => onCustomChange(true)}
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
            <Chip
              key={label}
              selected={selected}
              disabled={!custom}
              onClick={() => toggle(day)}
              className={`min-w-24 flex-col gap-0 ${!custom ? "cursor-default" : ""}`}
            >
              <span className="block">{label}</span>
              <span className="mt-0.5 block text-xs font-normal opacity-90">
                {selected ? "\u2713 Available" : "Unavailable"}
              </span>
            </Chip>
          );
        })}
      </div>

      {custom && days.length === 0 && (
        <p role="alert" className="mt-3 text-xs text-accent-dark">
          Pick at least one day, or switch back to your profile default.
        </p>
      )}
    </div>
  );
}
