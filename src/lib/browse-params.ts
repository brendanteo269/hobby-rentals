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
export type BrowseSort = "newest" | "nearest";

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
  return {
    q: first(params.q),
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
    sort: hasValidOrigin && first(params.sort) === "nearest" ? "nearest" : "newest",
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
    filters.max_price !== ""
    || filters.origin_lat !== null
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
  if (filters.origin_lat !== null && filters.origin_lng !== null && filters.radius_km !== null) {
    search.set("origin_lat", String(filters.origin_lat));
    search.set("origin_lng", String(filters.origin_lng));
    search.set("radius_km", String(filters.radius_km));
    if (filters.sort === "nearest") search.set("sort", "nearest");
  }
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
