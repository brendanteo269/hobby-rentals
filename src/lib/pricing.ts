import type { ListingCondition } from "@/lib/listings";

export type PricingCycle = "DAY" | "WEEK";

export type PricingRecommendationRequest = {
  category: string;
  brand: string;
  condition: ListingCondition;
  billing_cycle: PricingCycle;
};

export type PricingComparable = {
  id: string;
  name: string;
  category: string;
  brand: string;
  condition: ListingCondition;
  normalized_daily_rate_cents: number;
};

export type PricingDemand = {
  is_high_demand: boolean;
  velocity_score_7d: number;
  baseline_score: number;
  surge_percentage: number;
  suggested_multiplier: number;
};

export type PricingRecommendation = {
  status: "recommended" | "insufficient_data";
  category_active_count: number;
  usable_comparables_count: number;
  minimum_required: number;
  matching_tier: string | null;
  suggested_price_cents: number | null;
  lower_price_cents: number | null;
  upper_price_cents: number | null;
  comparables: PricingComparable[];
  outliers_excluded_count: number;
  demand: PricingDemand | null;
};
