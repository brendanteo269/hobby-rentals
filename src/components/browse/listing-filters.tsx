"use client";

import Link from "next/link";
import type { Route } from "next";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, ShieldCheck } from "lucide-react";
import { emitActivityEvent } from "@/app/analytics/actions";
import { FilterSelect } from "@/components/browse/filter-select";
import { RadiusSearch } from "@/components/browse/radius-search";
import { DateRangeFilter } from "@/components/browse/date-range-filter";
import { SearchBar, filterPill } from "@/components/browse/filter-bar";
import { browseHref, type BrowseFilters } from "@/lib/browse-params";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  isCategory,
} from "@/lib/listings";

/**
 * Search and filter controls for the browse page.
 *
 * A plain GET form, so the filters land in the URL and the page needs no
 * client JavaScript to work — the same approach as the admin portal's search.
 * A search bar on top, then one row of compact filters that apply as soon as
 * they are picked; the Search button applies everything at once.
 * `page` is deliberately not a field here: changing a filter produces a
 * different result set, so it starts again at page one rather than at page
 * four of the previous one.
 *
 * Each select carries one value. Multi-select filtering is supported by the
 * URL and the API (values within a filter are OR'd), and the chips above the
 * results remove them one at a time; a member builds a multi-value filter by
 * choosing again, which the form appends rather than replaces.
 */
export function ListingFilters({ filters, highDemandCategories = [] }: { filters: BrowseFilters; highDemandCategories?: string[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  function trackCategorySearch(formData: FormData) {
    const category = String(formData.get("category") ?? "");
    if (category) startTransition(async () => { await emitActivityEvent({ event_type: "category_search", category }); });
  }
  return (
    <form method="get" action="/browse" role="search" onSubmit={(event) => trackCategorySearch(new FormData(event.currentTarget))}>
      {/* Filters already applied ride along as hidden fields, so submitting
          the keyword box narrows the current view instead of resetting it. */}
      {filters.category.map((value) => (
        <input key={value} type="hidden" name="category" value={value} />
      ))}
      {filters.condition.map((value) => (
        <input key={value} type="hidden" name="condition" value={value} />
      ))}
      {filters.brand.map((value) => (
        <input key={value} type="hidden" name="brand" value={value} />
      ))}

      <SearchBar label="Search listings" placeholder="Search gear by name, description or brand" defaultValue={filters.q} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FilterSelect id="category" label="Category" placeholder="Category">
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect id="condition" label="Condition" placeholder="Condition">
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {CONDITION_LABELS[value]}
            </option>
          ))}
        </FilterSelect>

        <RadiusSearch key={`${filters.origin_lat}:${filters.origin_lng}:${filters.radius_km}:${filters.location_area.join(",")}`} filters={filters} />

        <DateRangeFilter start={filters.start_date} end={filters.end_date} />

        {/* A toggle, unlike the selects, so it shows its applied state and
            unticking it clears it. The box itself is visually hidden; the
            pill around it is what changes. */}
        <label
          className={`${filterPill} cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40`}
        >
          <input
            type="checkbox"
            name="verified"
            value="1"
            defaultChecked={filters.verified}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="sr-only"
          />
          <ShieldCheck className="size-4" aria-hidden="true" />
          Serial verified
        </label>

        <button
          type="button"
          onClick={() => { window.dispatchEvent(new Event("browse-location-reset")); router.replace("/browse", { scroll: false }); }}
          className="ml-1 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Reset
        </button>
      </div>

      {highDemandCategories.some(isCategory) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 font-medium text-accent-dark">
            <Flame className="size-4" aria-hidden="true" />
            Trending
          </span>
          {highDemandCategories.filter(isCategory).map((category) => (
            <Link
              key={category}
              href={browseHref({ ...filters, category: [category], page: 1 }) as Route}
              className="rounded-full bg-surface-muted px-3 py-1 text-ink-soft transition-colors hover:bg-accent-soft hover:text-accent-dark"
            >
              {CATEGORY_LABELS[category]}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}
