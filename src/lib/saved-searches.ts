import type { BrowseFilters } from "@/lib/browse-params";
import { CATEGORY_LABELS, CONDITION_LABELS, LOCATION_LABELS } from "@/lib/listings";

export type SavedSearchCriteria = {
  q: string;
  category: string[];
  condition: string[];
  location_area: string[];
  verified_only: boolean;
  min_daily_price_cents: number | null;
  max_daily_price_cents: number | null;
};

export type SavedSearch = { id: string; criteria: SavedSearchCriteria; created_at: string };

export function savedCriteriaFromBrowse(filters: BrowseFilters) {
  return {
    q: filters.q,
    category: filters.category,
    condition: filters.condition,
    location_area: filters.location_area,
    verified_only: filters.verified,
    min_daily_price: filters.min_price || null,
    max_daily_price: filters.max_price || null,
    origin_lat: filters.origin_lat,
    origin_lng: filters.origin_lng,
  };
}

export function hasSavedCriteria(filters: BrowseFilters): boolean {
  return Boolean(filters.q || filters.category.length || filters.condition.length || filters.location_area.length || filters.origin_lat !== null || filters.verified || filters.min_price || filters.max_price);
}

export function savedSearchLabel(criteria: SavedSearchCriteria): string {
  if (criteria.q) return `“${criteria.q}”`;
  if (criteria.category.length) return CATEGORY_LABELS[criteria.category[0]] ?? "Saved search";
  return "Saved search";
}

export function savedSearchCriteriaLabel(criteria: SavedSearchCriteria): string {
  const labels = [
    ...criteria.category.map((value) => CATEGORY_LABELS[value] ?? value),
    ...criteria.condition.map((value) => CONDITION_LABELS[value as keyof typeof CONDITION_LABELS] ?? value),
    ...criteria.location_area.map((value) => LOCATION_LABELS[value as keyof typeof LOCATION_LABELS] ?? value),
    ...(criteria.verified_only ? ["Serial verified"] : []),
  ];
  if (criteria.min_daily_price_cents !== null || criteria.max_daily_price_cents !== null) {
    const min = criteria.min_daily_price_cents === null ? "Any" : `S$${(criteria.min_daily_price_cents / 100).toFixed(2)}`;
    const max = criteria.max_daily_price_cents === null ? "Any" : `S$${(criteria.max_daily_price_cents / 100).toFixed(2)}`;
    labels.push(`${min} – ${max} / day`);
  }
  return labels.join(" · ");
}
