export type InsightsPeriod = "30d" | "3m" | "12m";

export type ListingInsight = {
  listing_id: string;
  listing_name: string;
  listing_status: string;
  settled_earnings_cents: number;
  completed_rentals: number;
  listing_opens: number;
  has_upcoming_availability: boolean;
  insight: string | null;
  action: "availability" | "price" | "edit" | "listing";
};

export type OwnerInsights = {
  period: InsightsPeriod;
  start_at: string;
  end_at: string;
  summary: { settled_earnings_cents: number; completed_rentals: number; listing_opens: number; includes_bundle_rentals: boolean };
  bundle_rentals: { completed_rentals: number; settled_earnings_cents: number };
  earnings_trend: { period_start: string; settled_earnings_cents: number }[];
  listing_groups: Record<"top_earners" | "most_viewed" | "needs_attention", ListingInsight[]>;
  market_demand: { category: string; searches: number; change_percent: number | null; trend_available: boolean }[];
};

export function isInsightsPeriod(value: string | undefined): value is InsightsPeriod {
  return value === "30d" || value === "3m" || value === "12m";
}
