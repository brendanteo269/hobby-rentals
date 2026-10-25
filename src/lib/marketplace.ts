/**
 * The marketplace is one catalogue shown two ways - single items and bundles
 * - each with its own page, API and filters. These are the filters both sides
 * understand, which the toggle between them carries across so switching never
 * loses the search the member typed.
 */

import { browseHref, parseBrowseFilters } from "@/lib/browse-params";
import { bundleBrowseHref, type BundleBrowseFilters } from "@/lib/bundle-browse-params";

export type MarketplaceKind = "items" | "bundles";

export type SharedMarketplaceFilters = Pick<BundleBrowseFilters, "q" | "category" | "location_area" | "start_date" | "end_date">;

/** Just the shared filters, dropping anything only one side has (condition, brand, distance...). */
export function sharedFilters(filters: SharedMarketplaceFilters): SharedMarketplaceFilters {
  const { q, category, location_area, start_date, end_date } = filters;
  return { q, category, location_area, start_date, end_date };
}

/** One side of the marketplace with the shared filters applied, from page one. */
export function marketplaceHref(kind: MarketplaceKind, filters: SharedMarketplaceFilters): string {
  const shared = sharedFilters(filters);
  return kind === "bundles"
    ? bundleBrowseHref({ ...shared, page: 1 })
    // Parsed with the query, so the sort is that search's default rather than pinned to newest.
    : browseHref({ ...parseBrowseFilters({ q: shared.q }), ...shared, page: 1 });
}
