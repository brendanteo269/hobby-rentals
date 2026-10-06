import Link from "next/link";
import type { Route } from "next";
import { formatDate } from "@/lib/format";

export type FilterChip = { key: string; label: string; href: string };

/**
 * The applied filters, each one removable, with a clear-all beside them.
 *
 * Shared by the listing and bundle browse pages. Each page works out its own
 * chips, because what a filter means and how you remove it are its business;
 * this only renders them, so the two pages cannot drift into looking like
 * different controls.
 *
 * Removal is a link to the same page minus that filter, not a button: it
 * needs no client JavaScript, and a member can open one in a new tab to
 * compare.
 */
export function FilterChips({ chips, clearHref }: { chips: FilterChip[]; clearHref: string }) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow">Filters</span>
      <ul className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href as Route}
              className="group inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-accent-dark transition-colors hover:bg-accent-soft/70"
            >
              {chip.label}
              <span aria-hidden="true" className="text-accent-dark/70 group-hover:text-accent-dark">
                ×
              </span>
              <span className="sr-only">Remove this filter</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={clearHref as Route}
        className="text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
      >
        Clear all
      </Link>
    </div>
  );
}

/**
 * How a date filter reads as a chip. The two dates only filter as a pair, so
 * they are always removed as one — clearing just the end date would silently
 * stop the whole date filter.
 */
export function dateRangeLabel(start: string, end: string): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return start ? `From ${formatDate(start)}` : `Until ${formatDate(end)}`;
}
