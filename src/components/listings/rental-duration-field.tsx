"use client";

import { useState } from "react";

const FLOOR = 1;
const CEILING = 30;

const thumb =
  "pointer-events-none absolute inset-x-0 top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent focus-visible:outline-none " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-cream [&::-webkit-slider-thumb]:active:cursor-grabbing " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-cream";

const days = (value: number) => `${value} ${value === 1 ? "day" : "days"}`;

/**
 * Minimum and maximum rental length as one range rather than two number boxes.
 *
 * The two bounds are a single decision — how long someone may keep the item —
 * and reading them off one track makes an impossible pair hard to enter in the
 * first place, which is the failure the two separate boxes invited.
 */
export function RentalDurationField({ minError, maxError }: { minError?: string; maxError?: string }) {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(7);
  const error = minError ?? maxError;

  const percent = (value: number) => ((value - FLOOR) / (CEILING - FLOOR)) * 100;

  return (
    <div>
      <span className="block text-sm font-medium">Rental duration</span>
      <p className="body-copy mt-2">
        The shortest and longest booking you will accept. Drag either handle.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <output className="rounded-sm border border-line bg-sand px-2.5 py-1.5 text-sm">
          Min {days(min)}
        </output>
        <output className="rounded-sm border border-line bg-sand px-2.5 py-1.5 text-sm">
          Max {days(max)}
        </output>
      </div>

      <div className="relative mt-4 h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-stone" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${percent(min)}%`, right: `${100 - percent(max)}%` }}
        />
        <input
          type="range"
          name="min_rental_days"
          aria-label="Minimum rental days"
          min={FLOOR}
          max={CEILING}
          step={1}
          value={min}
          onChange={(event) => setMin(Math.min(Number(event.target.value), max))}
          className={thumb}
          style={{ zIndex: min >= max ? 10 : 20 }}
        />
        <input
          type="range"
          name="max_rental_days"
          aria-label="Maximum rental days"
          min={FLOOR}
          max={CEILING}
          step={1}
          value={max}
          onChange={(event) => setMax(Math.max(Number(event.target.value), min))}
          className={thumb}
          style={{ zIndex: min >= max ? 20 : 10 }}
        />
      </div>

      <p className={`mt-3 text-xs ${error ? "text-clay" : "text-ink-soft"}`} {...(error ? { role: "alert" } : {})}>
        {error ?? `Renters can book this for ${days(min)} up to ${days(max)}.`}
      </p>
    </div>
  );
}
