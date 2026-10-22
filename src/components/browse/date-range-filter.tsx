"use client";

import { useCallback, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useDismiss } from "@/components/use-dismiss";
import { dateRangeLabel } from "./filter-chips";
import { filterPill } from "./filter-bar";

/**
 * The "Any dates" pill in the filter row, opening a small panel with the two
 * date fields. The fields stay in the form while the panel is closed - only
 * hidden - so the Search button submits the chosen dates wherever it is.
 */
export function DateRangeFilter({ start, end, hint }: { start: string; end: string; hint?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);

  const hasDates = Boolean(start || end);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="date-range-panel"
        className={`${filterPill} ${hasDates ? "border-ink" : ""}`}
      >
        <CalendarDays className="size-4" aria-hidden="true" />
        {hasDates ? dateRangeLabel(start, end) : "Any dates"}
        <ChevronDown className="size-4 text-ink-soft" aria-hidden="true" />
      </button>

      <div
        id="date-range-panel"
        hidden={!open}
        className="absolute left-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-4 shadow-lg"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start_date" className="block text-xs font-medium text-ink-soft">
              From
            </label>
            <Input id="start_date" name="start_date" type="date" defaultValue={start} className="mt-1" />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-xs font-medium text-ink-soft">
              Until
            </label>
            <Input id="end_date" name="end_date" type="date" defaultValue={end} className="mt-1" />
          </div>
        </div>
        {hint && <p className="mt-3 text-xs text-ink-soft">{hint}</p>}
        <div className="mt-4 flex justify-end">
          <Button type="submit" className="px-5 py-2">
            Apply dates
          </Button>
        </div>
      </div>
    </div>
  );
}
