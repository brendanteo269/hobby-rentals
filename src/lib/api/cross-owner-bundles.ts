/**
 * Cross-owner bundles API client (S5-08).
 *
 * Mirrors app/routers/cross_owner_bundles.py. Shapes live in
 * @/lib/cross-owner-bundles so the client-side editor can read them too; this
 * is the server-only half that talks to the backend.
 */

import "server-only";

import { backendRequest } from "@/lib/api/client";
import type {
  BuildCrossOwnerBundleRequest,
  CrossOwnerBundle,
  CrossOwnerBundleListing,
} from "@/lib/cross-owner-bundles";

export { BackendApiError as CrossOwnerBundleApiError } from "@/lib/api/client";

/**
 * Plans the gear for an activity with the local model and fills each item from
 * search. Slow by design (a model call and a search per item), and 503 when
 * the model cannot plan.
 */
export function buildCrossOwnerBundle(request: BuildCrossOwnerBundleRequest) {
  return backendRequest<CrossOwnerBundle>("/bundles/cross-owner/build", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** Listings the renter can add by hand: found by search and free for the bundle's dates. */
export function searchCrossOwnerBundleListings(params: {
  q: string;
  start_date: string;
  end_date: string;
  origin_lat?: number;
  origin_lng?: number;
}) {
  const search = new URLSearchParams({ q: params.q, start_date: params.start_date, end_date: params.end_date });
  if (params.origin_lat !== undefined && params.origin_lng !== undefined) {
    search.set("origin_lat", String(params.origin_lat));
    search.set("origin_lng", String(params.origin_lng));
  }
  return backendRequest<CrossOwnerBundleListing[]>(`/bundles/cross-owner/candidates?${search}`);
}
