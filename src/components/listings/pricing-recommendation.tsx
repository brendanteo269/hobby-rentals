"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { requestPriceRecommendation } from "@/app/listings/actions";
import { centsToDollars, formatMoney } from "@/lib/format";
import { CONDITION_LABELS, type ListingCondition } from "@/lib/listings";
import type { PricingCycle, PricingRecommendation } from "@/lib/pricing";

export function PricingRecommendationPanel({
  category,
  brand,
  condition,
  billingCycle,
  attributes,
  onApply,
}: {
  category: string;
  brand: string;
  condition: string;
  billingCycle: PricingCycle | null;
  attributes: Record<string, string | number>;
  /** Omit on read-only owner views, where a suggestion cannot change the saved rate. */
  onApply?: (rateDollars: string) => void;
}) {
  const [result, setResult] = useState<PricingRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllComparables, setShowAllComparables] = useState(false);
  const [pending, startTransition] = useTransition();
  const ready = Boolean(category && brand && condition && billingCycle);

  function request() {
    if (!billingCycle || !condition) return;
    setError(null);
    setShowAllComparables(false);
    startTransition(async () => {
      const response = await requestPriceRecommendation({ category, brand, condition: condition as ListingCondition, billing_cycle: billingCycle, attributes });
      if (response.error) setError(response.error);
      else if (response.recommendation) setResult(response.recommendation);
    });
  }

  const sortedComparables = result?.comparables.toSorted(
    (left, right) => left.normalized_daily_rate_cents - right.normalized_daily_rate_cents || left.name.localeCompare(right.name),
  ) ?? [];
  const visibleComparables = showAllComparables ? sortedComparables : sortedComparables.slice(0, 5);
  const hiddenComparableCount = sortedComparables.length - visibleComparables.length;

  return <div className="mt-4 border-t border-line pt-4">
    <Button type="button" variant="outline" disabled={!ready || pending} onClick={request}>
      {pending ? "Getting suggestion…" : "Get price suggestion"}
    </Button>
    {!ready && <p className="mt-2 text-xs text-ink-soft">Choose a category, brand, condition, and pricing unit first.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
    {result?.status === "insufficient_data" && <div className="mt-4 border border-line bg-sand p-4 text-sm"><p className="font-medium">Not enough comparable listings</p><p className="mt-1 text-ink-soft">There are currently fewer than {result.minimum_required} reliable active listings in this category. You can set any price you feel is fair.</p></div>}
    {result?.status === "recommended" && result.suggested_price_cents !== null && <div className="mt-4 border border-line bg-sand p-4 text-sm">
      <p className="font-medium">Recommended rental price: {formatMoney(result.suggested_price_cents)} / {billingCycle === "DAY" ? "day" : "week"}</p>
      <p className="mt-1 text-ink-soft">Range: {formatMoney(result.lower_price_cents!)} – {formatMoney(result.upper_price_cents!)}</p>
      {result.demand?.is_high_demand && <p className="mt-3"><span className="font-medium">High demand detected (+{result.demand.surge_percentage}%).</span> The category’s recent activity raised this suggestion by {Math.round((result.demand.suggested_multiplier - 1) * 100)}%.</p>}
      {onApply && <Button type="button" className="mt-4" onClick={() => onApply(centsToDollars(result.suggested_price_cents!))}>Apply {formatMoney(result.suggested_price_cents)}</Button>}
      <div className="mt-4 border-t border-line pt-3"><p className="font-medium">Based on {result.usable_comparables_count} active comparables</p>{result.matching_tier === "CATEGORY" && <p className="mt-1 text-xs text-ink-soft">Using a broader category comparison because fewer than three closer matches were available.</p>}<ul className="mt-2 space-y-2 text-ink-soft">{visibleComparables.map((item) => <li key={item.id}><p>{item.name} · {item.brand} · {CONDITION_LABELS[item.condition]} · {formatMoney(billingCycle === "DAY" ? item.normalized_daily_rate_cents : item.normalized_daily_rate_cents * 7)} / {billingCycle === "DAY" ? "day" : "week"}</p><p className="text-xs">Matched on: {item.matched_attributes.join(", ")}</p></li>)}</ul>{hiddenComparableCount > 0 && <Button type="button" variant="outline" className="mt-3" onClick={() => setShowAllComparables(true)}>Show all {sortedComparables.length} comparables</Button>}{showAllComparables && sortedComparables.length > 5 && <Button type="button" variant="outline" className="mt-3" onClick={() => setShowAllComparables(false)}>Show fewer comparables</Button>}{result.outliers_excluded_count > 0 && <p className="mt-2 text-xs text-ink-soft">{result.outliers_excluded_count} outlier{result.outliers_excluded_count === 1 ? "" : "s"} beyond 1.5× IQR excluded.</p>}</div>
    </div>}
  </div>;
}
