/**
 * The browse filters, as carried in the URL.
 *
 * Filters live in the query string rather than client state so a filtered
 * view can be linked, reloaded and reached from browser history — the same
 * reasoning as the admin portal's search. Three places need to agree on that
 * encoding (the page that reads it, the form that submits it, and the chips
 * that remove one filter at a time), so parsing and building both live here.
 */

import {
  isCategory,
  isCondition,
  isLocationArea,
  type ListingCategory,
  type ListingCondition,
  type LocationArea,
} from "@/lib/listings";

export const PAGE_SIZE = 12;

export type BrowseFilters = {
  q: string;
  category: ListingCategory[];
  condition: ListingCondition[];
  brand: string[];
  location_area: LocationArea[];
  /** ISO dates. Only applied by the backend when both are present. */
  start_date: string;
  end_date: string;
  page: number;
};

/** What Next hands a page for `?a=1&a=2`: a string, a list, or nothing. */
export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Normalises a repeatable param to a list, dropping blanks and duplicates.
 *
 * Duplicates are real: the filter form resubmits the applied values as hidden
 * fields, so choosing a value that is already applied would otherwise arrive
 * twice and render two identical chips, each removing only one of them.
 */
function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const entries = Array.isArray(value) ? value : [value];
  return [...new Set(entries.filter((entry) => entry !== ""))];
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * Reads filters from the URL, dropping anything unrecognised.
 *
 * A hand-edited `?category=BANANAS` is ignored rather than passed through, so
 * the backend never has to answer for a value this app does not offer.
 */
export function parseBrowseFilters(params: SearchParams): BrowseFilters {
  return {
    q: first(params.q),
    category: toList(params.category).filter(isCategory),
    condition: toList(params.condition).filter(isCondition),
    brand: toList(params.brand).map((brand) => brand.trim()).filter(Boolean),
    location_area: toList(params.location_area).filter(isLocationArea),
    start_date: first(params.start_date),
    end_date: first(params.end_date),
    page: Math.max(1, Number(first(params.page)) || 1),
  };
}

/** True when nothing is filtering the results — drives the empty-state copy. */
export function hasActiveFilters(filters: BrowseFilters): boolean {
  return (
    filters.q !== "" ||
    filters.category.length > 0 ||
    filters.condition.length > 0 ||
    filters.brand.length > 0 ||
    filters.location_area.length > 0 ||
    filters.start_date !== "" ||
    filters.end_date !== ""
  );
}

/**
 * Builds `/browse?…` for a set of filters.
 *
 * Page 1 is left out so the canonical first page has a clean URL, and so two
 * links to the same filters compare equal.
 */
export function browseHref(filters: BrowseFilters): string {
  const search = new URLSearchParams();

  if (filters.q) search.set("q", filters.q);
  filters.category.forEach((value) => search.append("category", value));
  filters.condition.forEach((value) => search.append("condition", value));
  filters.brand.forEach((value) => search.append("brand", value));
  filters.location_area.forEach((value) => search.append("location_area", value));
  if (filters.start_date) search.set("start_date", filters.start_date);
  if (filters.end_date) search.set("end_date", filters.end_date);
  if (filters.page > 1) search.set("page", String(filters.page));

  const query = search.toString();
  return query ? `/browse?${query}` : "/browse";
}

/**
 * The same filters at a different page.
 *
 * Changing a filter, by contrast, always returns to page one: the result set
 * is different, so page four of the old one means nothing.
 */
export function browsePageHref(filters: BrowseFilters, page: number): string {
  return browseHref({ ...filters, page });
}
