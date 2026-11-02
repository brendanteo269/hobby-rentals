import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { GearRequest, GearRequestDetail, GearRequestOffer } from "@/lib/gear-requests";

/** Mirrors the FastAPI routes in app/routers/gear_requests.py (S5-13). */

/** The board: open requests only, newest first. */
export function getGearRequestBoard() {
  return backendRequest<GearRequest[]>("/gear-requests");
}

/** The caller's own requests, open or closed. */
export function getMyGearRequests() {
  return backendRequest<GearRequest[]>("/gear-requests/mine");
}

export function getGearRequest(requestId: string) {
  return backendRequest<GearRequestDetail>(`/gear-requests/${encodeURIComponent(requestId)}`);
}

export function postGearRequest(body: {
  title: string;
  details?: string | null;
  category?: string | null;
  location_area?: string | null;
  start_date: string;
  end_date: string;
  max_daily_price_cents: number;
}) {
  return backendRequest<GearRequest>("/gear-requests", { method: "POST", body: JSON.stringify(body) });
}

/** S5-13 Scenario 3: an owner answering with one of their listings. */
export function offerListingOnGearRequest(requestId: string, listing_id: string, message?: string | null) {
  return backendRequest<GearRequestOffer>(
    `/gear-requests/${encodeURIComponent(requestId)}/offers`,
    { method: "POST", body: JSON.stringify({ listing_id, message: message || null }) },
  );
}

/** S5-13 Scenario 4: the renter taking their own request down. */
export function closeGearRequest(requestId: string) {
  return backendRequest<GearRequest>(`/gear-requests/${encodeURIComponent(requestId)}/close`, { method: "POST" });
}
