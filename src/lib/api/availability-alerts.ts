import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { AvailabilityAlert } from "@/lib/availability-alerts";

/** Mirrors the FastAPI routes in app/routers/availability_alerts.py (S4-07). */

/** Watches a listing's blocked-out range. Refused if the dates are bookable. */
export function setAvailabilityAlert(listingId: string, start_date: string, end_date: string) {
  return backendRequest<AvailabilityAlert>(
    `/listings/${encodeURIComponent(listingId)}/availability-alerts`,
    { method: "POST", body: JSON.stringify({ start_date, end_date }) },
  );
}

/** Stops further notifications for that listing and range. */
export function cancelAvailabilityAlert(alertId: string) {
  return backendRequest<AvailabilityAlert>(
    `/availability-alerts/${encodeURIComponent(alertId)}`,
    { method: "DELETE" },
  );
}

/** The caller's own alerts, optionally narrowed to one listing. */
export function getMyAvailabilityAlerts(listingId?: string) {
  const query = listingId ? `?listing_id=${encodeURIComponent(listingId)}` : "";
  return backendRequest<AvailabilityAlert[]>(`/availability-alerts/mine${query}`);
}
