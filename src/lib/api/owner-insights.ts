import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { InsightsPeriod, OwnerInsights } from "@/lib/owner-insights";

export function getOwnerInsights(period: InsightsPeriod) {
  return backendRequest<OwnerInsights>(`/analytics/owner-insights?period=${period}`);
}
