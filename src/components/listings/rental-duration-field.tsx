"use client";

import { useState } from "react";
import { Chip } from "@/components/ui";

const FLOOR = 1;
const CEILING = 30;

const thumb =
  "pointer-events-none absolute inset-x-0 top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent focus-visible:outline-none " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:active:cursor-grabbing " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-white";

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
  // An owner with no upper bound is not choosing a very large number of days,
  // they are declining to choose one. The field is simply omitted, which is
  // what the API already reads as "no maximum".
  const [unbounded, setUnbounded] = useState(false);
  const error = minError ?? maxError;

  const percent = (value: number) => ((value - FLOOR) / (CEILING - FLOOR)) * 100;

  return (
    <div>
      <span className="block text-sm font-medium">Rental duration</span>
      <p className="body-copy mt-2">
        The shortest and longest booking you will accept. Drag either handle.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <output className="rounded-full border border-line bg-surface-muted px-3 py-1.5 text-sm">
          Min {days(min)}
        </output>
        <div className="flex items-center gap-2">
          <output className="rounded-full border border-line bg-surface-muted px-3 py-1.5 text-sm">
            {unbounded ? "No maximum" : `Max ${days(max)}`}
          </output>
          <Chip
            selected={unbounded}
            onClick={() => {
              // The minimum may have been dragged past the parked maximum while
              // there was no upper bound to hold it back.
              if (unbounded) setMax((current) => Math.max(current, min));
              setUnbounded(!unbounded);
            }}
          >
            ∞
            <span className="sr-only"> No maximum rental length</span>
          </Chip>
        </div>
      </div>

      <div className="relative mt-4 h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${percent(min)}%`, right: unbounded ? "0%" : `${100 - percent(max)}%` }}
        />
        <input
          type="range"
          name="min_rental_days"
          aria-label="Minimum rental days"
          min={FLOOR}
          max={CEILING}
          step={1}
          value={min}
          onChange={(event) =>
            setMin(unbounded ? Number(event.target.value) : Math.min(Number(event.target.value), max))
          }
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
          disabled={unbounded}
          className={`${thumb} ${unbounded ? "invisible" : ""}`}
          style={{ zIndex: min >= max ? 20 : 10 }}
        />
      </div>

      <p className={`mt-3 text-xs ${error ? "text-accent-dark" : "text-ink-soft"}`} {...(error ? { role: "alert" } : {})}>
        {error ??
          (unbounded
            ? `Renters can book this for ${days(min)} or longer, with no upper limit.`
            : `Renters can book this for ${days(min)} up to ${days(max)}.`)}
      </p>
    </div>
  );
}
