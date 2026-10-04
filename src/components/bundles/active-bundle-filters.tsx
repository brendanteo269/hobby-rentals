import { FilterChips, dateRangeLabel, type FilterChip } from "@/components/browse/filter-chips";
import {
  bundleBrowseHref,
  hasActiveBundleFilters,
  type BundleBrowseFilters,
} from "@/lib/bundle-browse-params";
import { CATEGORY_LABELS, LOCATION_LABELS } from "@/lib/listings";

/** Every filter currently narrowing the bundle results, each one removable. */
export function ActiveBundleFilters({ filters }: { filters: BundleBrowseFilters }) {
  if (!hasActiveBundleFilters(filters)) return null;

  const chips: FilterChip[] = [];
  // Removing anything returns to page one, since the result set changes.
  const without = (changes: Partial<BundleBrowseFilters>) =>
    bundleBrowseHref({ ...filters, ...changes, page: 1 });

  if (filters.q) {
    chips.push({ key: "q", label: `“${filters.q}”`, href: without({ q: "" }) });
  }

  filters.category.forEach((value) =>
    chips.push({
      key: `category:${value}`,
      label: CATEGORY_LABELS[value] ?? value,
      href: without({ category: filters.category.filter((other) => other !== value) }),
    }),
  );

  filters.location_area.forEach((value) =>
    chips.push({
      key: `location_area:${value}`,
      label: LOCATION_LABELS[value],
      href: without({ location_area: filters.location_area.filter((other) => other !== value) }),
    }),
  );

  // The two dates only filter as a pair, so they are removed as one chip.
  if (filters.start_date || filters.end_date) {
    chips.push({
      key: "dates",
      label: dateRangeLabel(filters.start_date, filters.end_date),
      href: without({ start_date: "", end_date: "" }),
    });
  }

  return <FilterChips chips={chips} clearHref="/bundles" />;
}
