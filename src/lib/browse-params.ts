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
  type RelaxableFilter,
} from "@/lib/listings";

export const PAGE_SIZE = 12;
/** Relevance only means something with a query; it is the default then, newest otherwise. */
export type BrowseSort = "relevance" | "newest" | "nearest";

export type BrowseFilters = {
  q: string;
  category: ListingCategory[];
  condition: ListingCondition[];
  brand: string[];
  location_area: LocationArea[];
  /** ISO dates. Only applied by the backend when both are present. */
  start_date: string;
  end_date: string;
  /** S2-30: serial-verified listings only. */
  verified: boolean;
  /** Daily prices in dollars, as entered in the browse form. */
  min_price: string;
  max_price: string;
  origin_lat: number | null;
  origin_lng: number | null;
  radius_km: number | null;
  sort: BrowseSort;
  page: number;
};

/** What Next hands a page for `?a=1&a=2`: a string, a list, or nothing. */
export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Normalises a repeatable param to a list, dropping blanks and duplicates.
 * Exported for the bundle filters, which carry different filters in the same
 * encoding.
 *
 * Duplicates are real: the filter form resubmits the applied values as hidden
 * fields, so choosing a value that is already applied would otherwise arrive
 * twice and render two identical chips, each removing only one of them.
 */
export function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const entries = Array.isArray(value) ? value : [value];
  return [...new Set(entries.filter((entry) => entry !== ""))];
}

export function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function coordinate(value: string): number | null {
  if (value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function price(value: string): string {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : "";
}

/** What the results are sorted by when the URL says nothing. */
export function defaultSort(q: string): BrowseSort {
  return q ? "relevance" : "newest";
}

/**
 * Reads filters from the URL, dropping anything unrecognised.
 *
 * A hand-edited `?category=BANANAS` is ignored rather than passed through, so
 * the backend never has to answer for a value this app does not offer.
 */
export function parseBrowseFilters(params: SearchParams): BrowseFilters {
  const originLat = coordinate(first(params.origin_lat));
  const originLng = coordinate(first(params.origin_lng));
  const radius = coordinate(first(params.radius_km));
  const hasValidOrigin = originLat !== null && originLng !== null && radius !== null && originLat >= -90 && originLat <= 90 && originLng >= -180 && originLng <= 180 && radius >= 1 && radius <= 20;
  const q = first(params.q);
  const sort = first(params.sort);
  return {
    q,
    category: toList(params.category).filter(isCategory),
    condition: toList(params.condition).filter(isCondition),
    brand: toList(params.brand).map((brand) => brand.trim()).filter(Boolean),
    location_area: hasValidOrigin ? [] : toList(params.location_area).filter(isLocationArea),
    start_date: first(params.start_date),
    end_date: first(params.end_date),
    verified: ["1", "true"].includes(first(params.verified)),
    min_price: price(first(params.min_price)),
    max_price: price(first(params.max_price)),
    origin_lat: hasValidOrigin ? originLat : null,
    origin_lng: hasValidOrigin ? originLng : null,
    radius_km: hasValidOrigin ? radius : null,
    sort:
      sort === "nearest" && hasValidOrigin ? "nearest"
      : sort === "newest" ? "newest"
      : sort === "relevance" && q ? "relevance"
      : defaultSort(q),
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
    filters.end_date !== "" ||
    filters.verified ||
    filters.min_price !== "" ||
    filters.max_price !== "" ||
    filters.origin_lat !== null
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
  if (filters.verified) search.set("verified", "1");
  if (filters.min_price) search.set("min_price", filters.min_price);
  if (filters.max_price) search.set("max_price", filters.max_price);
  const hasOrigin = filters.origin_lat !== null && filters.origin_lng !== null && filters.radius_km !== null;
  if (hasOrigin) {
    search.set("origin_lat", String(filters.origin_lat));
    search.set("origin_lng", String(filters.origin_lng));
    search.set("radius_km", String(filters.radius_km));
  }
  // Nearest needs an origin and relevance a query; without them each falls
  // back to the default. Only a sort other than the default is written, so
  // the default stays a clean URL.
  const usable =
    (filters.sort === "nearest" && !hasOrigin) || (filters.sort === "relevance" && !filters.q)
      ? defaultSort(filters.q)
      : filters.sort;
  if (usable !== defaultSort(filters.q)) search.set("sort", usable);
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

/** What each filter the no-results state offers to remove is called on its button. */
export const RELAX_FILTER_LABELS: Record<RelaxableFilter, string> = {
  dates: "Any dates",
  price: "Any price",
  category: "Any category",
  radius: "Anywhere, not just nearby",
  location_area: "Any area",
  condition: "Any condition",
  brand: "Any brand",
  verified_only: "Include unverified serials",
};

/**
 * The same search with one filter removed, for the no-results state's
 * suggestions (Scenario 4). Mirrors what the backend counted for it.
 */
export function relaxedHref(filters: BrowseFilters, filter: RelaxableFilter): string {
  const changes: Record<RelaxableFilter, Partial<BrowseFilters>> = {
    dates: { start_date: "", end_date: "" },
    price: { min_price: "", max_price: "" },
    category: { category: [] },
    radius: { origin_lat: null, origin_lng: null, radius_km: null, sort: defaultSort(filters.q) },
    location_area: { location_area: [] },
    condition: { condition: [] },
    brand: { brand: [] },
    verified_only: { verified: false },
  };
  return browseHref({ ...filters, ...changes[filter], page: 1 });
}

/** A related category to browse instead: that category on its own, no search or other filters. */
export function relatedCategoryHref(category: string): string {
  return browseHref({ ...parseBrowseFilters({}), category: isCategory(category) ? [category] : [] });
}
