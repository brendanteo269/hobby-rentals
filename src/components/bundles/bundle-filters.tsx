import { FilterSelect } from "@/components/browse/filter-select";
import { DateRangeFilter } from "@/components/browse/date-range-filter";
import { SearchBar } from "@/components/browse/filter-bar";
import type { BundleBrowseFilters } from "@/lib/bundle-browse-params";
import { CATEGORIES, CATEGORY_LABELS, LOCATION_AREAS, LOCATION_LABELS } from "@/lib/listings";

/**
 * Search and filter controls for the bundle marketplace.
 *
 * The same plain GET form the listing browse uses, so the filters land in the
 * URL and the page needs no client JavaScript. `page` is deliberately not a
 * field: changing a filter produces a different result set, so it starts
 * again at page one.
 *
 * Fewer filters than the listing form on purpose. A bundle has no condition
 * or brand of its own - its items do, and a set whose camera is new and whose
 * tripod is worn would match "New" while being nothing of the sort. Category
 * and area are offered because "contains something in this category" and
 * "collectable here" are both things a renter actually means.
 */
export function BundleFilters({ filters }: { filters: BundleBrowseFilters }) {
  return (
    <form method="get" action="/bundles" role="search">
      {/* Filters already applied ride along as hidden fields, so submitting
          the keyword box narrows the current view instead of resetting it. */}
      {filters.category.map((value) => (
        <input key={value} type="hidden" name="category" value={value} />
      ))}
      {filters.location_area.map((value) => (
        <input key={value} type="hidden" name="location_area" value={value} />
      ))}

      <SearchBar label="Search bundles" placeholder="Search bundles by name, or an item inside one" defaultValue={filters.q} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FilterSelect id="category" label="Contains a category" placeholder="Contains">
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect id="location_area" label="Collection area" placeholder="Area">
          {LOCATION_AREAS.map((value) => (
            <option key={value} value={value}>
              {LOCATION_LABELS[value]}
            </option>
          ))}
        </FilterSelect>

        <DateRangeFilter
          start={filters.start_date}
          end={filters.end_date}
          hint="Give both dates to show only bundles whose every item is free for all of them."
        />
      </div>
    </form>
  );
}
