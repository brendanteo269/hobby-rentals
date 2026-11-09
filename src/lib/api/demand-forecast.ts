import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { DemandForecast } from "@/lib/demand-forecast";

export function getDemandForecast() {
  return backendRequest<DemandForecast>("/analytics/demand-forecast");
}
