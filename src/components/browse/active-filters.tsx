import { FilterChips, dateRangeLabel, type FilterChip } from "@/components/browse/filter-chips";
import { browseHref, hasActiveFilters, type BrowseFilters } from "@/lib/browse-params";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  LOCATION_LABELS,
  type ListingCategory,
  type ListingCondition,
  type LocationArea,
} from "@/lib/listings";

/**
 * Every filter currently narrowing the results, each one removable.
 *
 * Removal is a link to the same page minus that filter, not a button: it needs
 * no client JavaScript, and a member can open one in a new tab to compare.
 * Removing anything returns to page one, since the result set changes.
 */
export function ActiveFilters({ filters }: { filters: BrowseFilters }) {
  if (!hasActiveFilters(filters)) return null;

  const chips: FilterChip[] = [];

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

  if (filters.verified) {
    chips.push({ key: "verified", label: "Serial verified", href: without({ verified: false }) });
  }

  // The two dates only filter as a pair, so they are removed as one chip —
  // clearing just the end date would silently stop the whole date filter.
  if (filters.start_date || filters.end_date) {
    chips.push({
      key: "dates",
      label: dateRangeLabel(filters.start_date, filters.end_date),
      href: without({ start_date: "", end_date: "" }),
    });
  }

  return <FilterChips chips={chips} clearHref="/browse" />;
}
