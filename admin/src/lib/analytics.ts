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

export type PlatformPeriodMetrics = {
  bookings: number; gmv_cents: number; platform_revenue_cents: number;
  active_listings: number; new_signups: number; utilisation_pct: number;
};

export type LostRequests = {
  declined: number; declined_value_cents: number; expired: number; expired_value_cents: number;
  declines_by_reason: { reason: string; count: number }[];
  top_owners: { owner_id: string; display_name: string | null; email: string | null; declined: number; expired: number; lost_value_cents: number }[];
};

export type ViewedNotBookedListing = {
  listing_id: string; name: string; category: string; owner_id: string; views: number;
  daily_rate_cents: number; category_median_daily_rate_cents: number;
};

export type PlatformMetrics = {
  start: string; end: string; previous_start: string; previous_end: string;
  current: PlatformPeriodMetrics; previous: PlatformPeriodMetrics;
  lost_requests: LostRequests; viewed_not_booked: ViewedNotBookedListing[];
};

/** S4-05. A rejected range (backwards, or over a year) comes back as `error` with the API's reason. */
export async function getPlatformMetrics(from: string, to: string): Promise<{ data: PlatformMetrics } | { error: string }> {
  const response = await fetch(`${apiUrl()}/admin/analytics/platform-metrics?${new URLSearchParams({ from, to })}`, {
    headers: { "X-Admin-Key": adminApiKey() },
    cache: "no-store",
  });
  if (response.status === 400) return { error: (await response.json()).detail };
  if (!response.ok) throw new Error(`Platform metrics lookup failed: ${response.status}`);
  return { data: await response.json() };
}

const DAY_MS = 86_400_000;

/** YYYY-MM-DD in Singapore, the calendar the metrics are counted in. */
function singaporeDate(time: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(time);
}

/** The dashboard's default range: the last 30 days, today included. */
export function lastThirtyDays(): { from: string; to: string } {
  const now = Date.now();
  return { from: singaporeDate(now - 29 * DAY_MS), to: singaporeDate(now) };
}
