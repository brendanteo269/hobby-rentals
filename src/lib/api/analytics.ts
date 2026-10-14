import "server-only";

import { backendRequest } from "@/lib/api/client";

export type CategoryDemand = { category: string; is_high_demand: boolean; suggested_multiplier: number; surge_percentage: number };
export type ActivityEvent = {
  event_type: "listing_view" | "category_search" | "bundle_view";
  category: string;
  listing_id?: string;
  /** Set on a bundle_view. A bundle view is not a view of its components. */
  bundle_id?: string;
};

export function recordActivityEvent(event: ActivityEvent) {
  return backendRequest<void>("/analytics/events", { method: "POST", body: JSON.stringify(event) });
}

export function getCategoryDemand(category: string) {
  return backendRequest<CategoryDemand>(`/analytics/category-demand/${encodeURIComponent(category)}`, { cache: "force-cache", next: { revalidate: 300 } });
}

export function getCategoryDemandOverview() {
  return backendRequest<CategoryDemand[]>("/analytics/category-demand", { cache: "force-cache", next: { revalidate: 300 } });
}
