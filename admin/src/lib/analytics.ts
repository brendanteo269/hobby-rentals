import { adminApiKey, apiUrl } from "@/lib/env";

export type AdminCategoryDemand = {
  category: string; label: string; views_7d: number; searches_7d: number;
  velocity_score_7d: number; baseline_score: number; surge_percentage: number;
  is_high_demand: boolean; suggested_multiplier: number;
};

export async function getAdminCategoryDemand(): Promise<AdminCategoryDemand[]> {
  const response = await fetch(`${apiUrl()}/admin/analytics/category-demand`, {
    headers: { "X-Admin-Key": adminApiKey() },
    // Admin analytics is used to verify live telemetry; never show a stale
    // aggregate after the administrator explicitly refreshes this page.
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Category demand lookup failed: ${response.status}`);
  return response.json();
}
