import { Button, Input } from "@/components/ui";
import { FilterSelect } from "@/components/browse/filter-select";
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
    <form method="get" action="/bundles" role="search" className="card p-5">
      {/* Filters already applied ride along as hidden fields, so submitting
          the keyword box narrows the current view instead of resetting it. */}
      {filters.category.map((value) => (
        <input key={value} type="hidden" name="category" value={value} />
      ))}
      {filters.location_area.map((value) => (
        <input key={value} type="hidden" name="location_area" value={value} />
      ))}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="block text-sm font-medium">
            Search bundles
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Bundle name, or an item inside it"
            autoComplete="off"
            className="mt-2"
          />
        </div>

        <FilterSelect id="category" label="Contains" placeholder="Any category">
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect id="location_area" label="Area" placeholder="Anywhere">
          {LOCATION_AREAS.map((value) => (
            <option key={value} value={value}>
              {LOCATION_LABELS[value]}
            </option>
          ))}
        </FilterSelect>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <div className="min-w-40">
          <label htmlFor="start_date" className="block text-sm font-medium">
            From
          </label>
          <Input id="start_date" name="start_date" type="date" defaultValue={filters.start_date} className="mt-2" />
        </div>
        <div className="min-w-40">
          <label htmlFor="end_date" className="block text-sm font-medium">
            Until
          </label>
          <Input id="end_date" name="end_date" type="date" defaultValue={filters.end_date} className="mt-2" />
        </div>
        <p className="body-copy min-w-48 flex-1 pb-2.5">
          Give both dates to show only bundles whose every item is free for all of them.
        </p>
        <Button type="submit">Apply</Button>
      </div>
    </form>
  );
}
