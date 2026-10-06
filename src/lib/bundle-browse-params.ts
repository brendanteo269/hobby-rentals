/**
 * The gear-bundle browse filters, as carried in the URL.
 *
 * Same encoding and the same reasoning as @/lib/browse-params — filters live
 * in the query string so a filtered view can be linked, reloaded and reached
 * from history — and it shares that module's parsing primitives. The filter
 * set differs, which is why this is its own type rather than a flag on that
 * one: a bundle has no condition or brand of its own, and its category and
 * area are whatever its items are.
 */

import { first, toList } from "@/lib/browse-params";
import { isCategory, isLocationArea, type ListingCategory, type LocationArea } from "@/lib/listings";

export const BUNDLE_PAGE_SIZE = 12;

export type BundleBrowseFilters = {
  q: string;
  /** A bundle matches if any item in it is in one of these. */
  category: ListingCategory[];
  location_area: LocationArea[];
  /** ISO dates. Only applied by the backend when both are present. */
  start_date: string;
  end_date: string;
  page: number;
};

/** Reads filters from the URL, dropping anything unrecognised. */
export function parseBundleFilters(
  params: Record<string, string | string[] | undefined>,
): BundleBrowseFilters {
  return {
    q: first(params.q),
    category: toList(params.category).filter(isCategory),
    location_area: toList(params.location_area).filter(isLocationArea),
    start_date: first(params.start_date),
    end_date: first(params.end_date),
    page: Math.max(1, Number(first(params.page)) || 1),
  };
}

/** True when nothing is narrowing the results — drives the empty-state copy. */
export function hasActiveBundleFilters(filters: BundleBrowseFilters): boolean {
  return (
    filters.q !== "" ||
    filters.category.length > 0 ||
    filters.location_area.length > 0 ||
    filters.start_date !== "" ||
    filters.end_date !== ""
  );
}

/**
 * Builds `/bundles?…`. Page 1 is left out so the canonical first page has a
 * clean URL, and two links to the same filters compare equal.
 */
export function bundleBrowseHref(filters: BundleBrowseFilters): string {
  const search = new URLSearchParams();

  if (filters.q) search.set("q", filters.q);
  filters.category.forEach((value) => search.append("category", value));
  filters.location_area.forEach((value) => search.append("location_area", value));
  if (filters.start_date) search.set("start_date", filters.start_date);
  if (filters.end_date) search.set("end_date", filters.end_date);
  if (filters.page > 1) search.set("page", String(filters.page));

  const query = search.toString();
  return query ? `/bundles?${query}` : "/bundles";
}

/**
 * The same filters at a different page. Changing a filter, by contrast,
 * always returns to page one: the result set is different, so page four of
 * the old one means nothing.
 */
export function bundleBrowsePageHref(filters: BundleBrowseFilters, page: number): string {
  return bundleBrowseHref({ ...filters, page });
}
