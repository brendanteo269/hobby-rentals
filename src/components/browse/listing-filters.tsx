import { Button, Input, Select } from "@/components/ui";
import type { BrowseFilters } from "@/lib/browse-params";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  LOCATION_AREAS,
  LOCATION_LABELS,
} from "@/lib/listings";

/**
 * Search and filter controls for the browse page.
 *
 * A plain GET form, so the filters land in the URL and the page needs no
 * client JavaScript to work — the same approach as the admin portal's search.
 * `page` is deliberately not a field here: changing a filter produces a
 * different result set, so it starts again at page one rather than at page
 * four of the previous one.
 *
 * Each select carries one value. Multi-select filtering is supported by the
 * URL and the API (values within a filter are OR'd), and the chips above the
 * results remove them one at a time; a member builds a multi-value filter by
 * choosing again, which the form appends rather than replaces.
 */
export function ListingFilters({ filters }: { filters: BrowseFilters }) {
  return (
    <form method="get" action="/browse" role="search" className="border border-line bg-white p-5">
      {/* Filters already applied ride along as hidden fields, so submitting
          the keyword box narrows the current view instead of resetting it. */}
      {filters.category.map((value) => (
        <input key={value} type="hidden" name="category" value={value} />
      ))}
      {filters.condition.map((value) => (
        <input key={value} type="hidden" name="condition" value={value} />
      ))}
      {filters.location_area.map((value) => (
        <input key={value} type="hidden" name="location_area" value={value} />
      ))}
      {filters.brand.map((value) => (
        <input key={value} type="hidden" name="brand" value={value} />
      ))}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="block text-sm font-medium">
            Search gear
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Name, description or brand"
            autoComplete="off"
            className="mt-2"
          />
        </div>

        <FilterSelect id="category" label="Category" placeholder="Any category">
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

        <FilterSelect id="condition" label="Condition" placeholder="Any condition">
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {CONDITION_LABELS[value]}
            </option>
          ))}
        </FilterSelect>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <div className="min-w-40">
          <label htmlFor="start_date" className="block text-sm font-medium">
            From
          </label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={filters.start_date}
            className="mt-2"
          />
        </div>
        <div className="min-w-40">
          <label htmlFor="end_date" className="block text-sm font-medium">
            Until
          </label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={filters.end_date}
            className="mt-2"
          />
        </div>
        <p className="body-copy min-w-48 flex-1 pb-2.5">
          Give both dates to hide gear that is already booked or blacked out then.
        </p>
        <Button type="submit">Apply</Button>
      </div>
    </form>
  );
}

/**
 * One filter dropdown. Left uncontrolled and blank on every render: the
 * applied values are shown as removable chips above the results, so repeating
 * them as a selection here would offer two ways to change one thing.
 */
function FilterSelect({
  id,
  label,
  placeholder,
  children,
}: {
  id: string;
  label: string;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-44">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <Select id={id} name={id} defaultValue="" className="mt-2">
        <option value="">{placeholder}</option>
        {children}
      </Select>
    </div>
  );
}
