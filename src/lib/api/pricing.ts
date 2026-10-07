import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { PricingRecommendation, PricingRecommendationRequest } from "@/lib/pricing";

export function getPricingRecommendation(request: PricingRecommendationRequest) {
  return backendRequest<PricingRecommendation>("/pricing/recommendations", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
