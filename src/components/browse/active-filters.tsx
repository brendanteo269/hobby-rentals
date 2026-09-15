import Link from "next/link";
import type { Route } from "next";
import { browseHref, hasActiveFilters, type BrowseFilters } from "@/lib/browse-params";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  LOCATION_LABELS,
  type ListingCategory,
  type ListingCondition,
  type LocationArea,
} from "@/lib/listings";
import { formatDate } from "@/lib/format";

/**
 * Every filter currently narrowing the results, each one removable.
 *
 * Removal is a link to the same page minus that filter, not a button: it needs
 * no client JavaScript, and a member can open one in a new tab to compare.
 * Removing anything returns to page one, since the result set changes.
 */
export function ActiveFilters({ filters }: { filters: BrowseFilters }) {
  if (!hasActiveFilters(filters)) return null;

  const chips: { key: string; label: string; href: string }[] = [];

  const without = (changes: Partial<BrowseFilters>) =>
    browseHref({ ...filters, ...changes, page: 1 });

  if (filters.q) {
    chips.push({ key: "q", label: `“${filters.q}”`, href: without({ q: "" }) });
  }

  const pushAll = <T extends string>(
    name: "category" | "condition" | "location_area",
    values: T[],
    labels: Record<T, string>,
  ) =>
    values.forEach((value) =>
      chips.push({
        key: `${name}:${value}`,
        label: labels[value],
        href: without({ [name]: values.filter((v) => v !== value) } as Partial<BrowseFilters>),
      }),
    );

  pushAll<ListingCategory>("category", filters.category, CATEGORY_LABELS);
  pushAll<LocationArea>("location_area", filters.location_area, LOCATION_LABELS);
  pushAll<ListingCondition>("condition", filters.condition, CONDITION_LABELS);

  filters.brand.forEach((brand) =>
    chips.push({
      key: `brand:${brand}`,
      label: brand,
      href: without({ brand: filters.brand.filter((b) => b !== brand) }),
    }),
  );

  // The two dates only filter as a pair, so they are removed as one chip —
  // clearing just the end date would silently stop the whole date filter.
  if (filters.start_date || filters.end_date) {
    chips.push({
      key: "dates",
      label: dateRangeLabel(filters.start_date, filters.end_date),
      href: without({ start_date: "", end_date: "" }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow">Filters</span>
      <ul className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <FilterChip label={chip.label} href={chip.href} />
          </li>
        ))}
      </ul>
      <Link
        href={"/browse" as Route}
        className="text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
      >
        Clear all
      </Link>
    </div>
  );
}

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href as Route}
      className="group inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-accent-dark transition-colors hover:bg-accent-soft/70"
    >
      {label}
      <span aria-hidden="true" className="text-accent-dark/70 group-hover:text-accent-dark">
        ×
      </span>
      <span className="sr-only">Remove this filter</span>
    </Link>
  );
}

function dateRangeLabel(start: string, end: string): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return start ? `From ${formatDate(start)}` : `Until ${formatDate(end)}`;
}
