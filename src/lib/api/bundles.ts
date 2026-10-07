/**
 * Bundles API client for the frontend.
 *
 * Mirrors the FastAPI routes in app/routers/bundles.py. Shapes and display
 * labels live in @/lib/bundles so client components can read them too; this
 * module is the server-only half that actually talks to the backend.
 */

import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { ListingCategory, LocationArea } from "@/lib/listings";
import type {
  BrowseBundlesResponse,
  Bundle,
  BundleAvailability,
  BundleBooking,
  BundleEvent,
  BundleQuote,
  CreateBundleRequest,
  FeaturedBundleCard,
  UpdateBundleRequest,
} from "@/lib/bundles";
import type { BookingStatus, DeclineReason } from "@/lib/bookings";

export { BackendApiError as BundleApiError } from "@/lib/api/client";

/**
 * Browse/search filters, as the backend expects them.
 *
 * Values within one list are OR'd; the lists are AND'd against each other.
 * A bundle matches a category or an area if any item in it does. start_date
 * and end_date only take effect together - the backend ignores a lone one.
 */
export type BrowseBundlesParams = {
  q?: string;
  category?: ListingCategory[];
  location_area?: LocationArea[];
  start_date?: string;
  end_date?: string;
  owner_id?: string;
  page?: number;
  page_size?: number;
};

/**
 * Published bundles only. One unpublished because a component stopped being
 * available is absent here, while that component's own listing is unaffected
 * and still browsable on its own (S2-20 Scenario 6).
 */
export function browseBundles(params: BrowseBundlesParams = {}) {
  const search = new URLSearchParams();

  // Repeated key per value: FastAPI reads list query params that way.
  const appendAll = (key: string, values: string[] | undefined) =>
    values?.forEach((value) => search.append(key, value));

  if (params.q) search.set("q", params.q);
  appendAll("category", params.category);
  appendAll("location_area", params.location_area);
  if (params.start_date) search.set("start_date", params.start_date);
  if (params.end_date) search.set("end_date", params.end_date);
  if (params.owner_id) search.set("owner_id", params.owner_id);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.page_size) search.set("page_size", String(params.page_size));

  const query = search.toString();
  return backendRequest<BrowseBundlesResponse>(`/bundles${query ? `?${query}` : ""}`);
}

/** The signed-in owner's bundles, unpublished ones included, newest first. */
export function getMyBundles() {
  return backendRequest<Bundle[]>("/bundles/mine");
}

/** The API 404s if this caller can't see it (not ACTIVE and not theirs). */
export function getBundle(bundleId: string) {
  return backendRequest<Bundle>(`/bundles/${encodeURIComponent(bundleId)}`);
}

/** Creates the bundle already published (Scenario 1). Every listing must be the caller's own and ACTIVE. */
export function createBundle(data: CreateBundleRequest) {
  return backendRequest<Bundle>("/bundles", { method: "POST", body: JSON.stringify(data) });
}

/**
 * Edits the caller's own bundle. Send only what changed; `listing_ids`, when
 * sent, replaces the membership outright. The component listings themselves
 * are never touched (Scenario 3) - those are edited through /listings/{id}.
 */
export function updateBundle(bundleId: string, changes: UpdateBundleRequest) {
  return backendRequest<Bundle>(`/bundles/${encodeURIComponent(bundleId)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

/** Soft-removes the bundle, leaving its components independently bookable. */
export function removeBundle(bundleId: string) {
  return backendRequest<Bundle>(`/bundles/${encodeURIComponent(bundleId)}`, { method: "DELETE" });
}

/** Dates every component is simultaneously free, and who blocks the rest (Scenario 2). */
export function getBundleAvailability(bundleId: string) {
  return backendRequest<BundleAvailability>(`/bundles/${encodeURIComponent(bundleId)}/availability`);
}

/** Prices a range at the rate block its duration reaches (Scenario 4). */
export function getBundleQuote(bundleId: string, startDate: string, endDate: string) {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate });
  return backendRequest<BundleQuote>(`/bundles/${encodeURIComponent(bundleId)}/quote?${query}`);
}

/** Why the bundle was unpublished or restored, and which component did it. Owner-only. */
export function getBundleEvents(bundleId: string) {
  return backendRequest<BundleEvent[]>(`/bundles/${encodeURIComponent(bundleId)}/events`);
}


/**
 * Requests the whole set for one date range: one wallet hold, and one PENDING
 * reservation per item, created together or not at all. `idempotencyKey` is
 * generated once per attempt and reused across retries of it, so a
 * double-submit places only one hold.
 */
export function createBundleBooking(
  bundleId: string,
  start_date: string,
  end_date: string,
  idempotency_key: string,
) {
  return backendRequest<BundleBooking>(`/bundles/${encodeURIComponent(bundleId)}/bookings`, {
    method: "POST",
    body: JSON.stringify({ start_date, end_date, idempotency_key }),
  });
}

/** The signed-in renter's bundle bookings, newest first. */
export function getMyBundleBookings() {
  return backendRequest<BundleBooking[]>("/bundles/bookings/mine");
}

/** Bundle bookings against the signed-in owner's sets. */
export function getOwnerBundleBookings() {
  return backendRequest<BundleBooking[]>("/bundles/bookings/owner");
}

/** The owner declines a bundle request, saying why; every item goes with it and the hold is released. */
export function declineBundleBooking(bundleBookingId: string, reason: DeclineReason, note: string | null) {
  return backendRequest<BundleBooking>(
    `/bundles/bookings/${encodeURIComponent(bundleBookingId)}/decline`,
    { method: "POST", body: JSON.stringify({ reason, note }) },
  );
}

/** The owner accepting, or cancelling once confirmed, applied to the set and every item in it at once. */
export function updateBundleBookingStatus(bundleBookingId: string, nextStatus: BookingStatus) {
  return backendRequest<BundleBooking>(
    `/bundles/bookings/${encodeURIComponent(bundleBookingId)}/status`,
    { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
  );
}


/**
 * S2-30: bundles for the landing page's showcase.
 *
 * The landing page is public, so this cannot use backendRequest, which rightly
 * redirects an anonymous caller to login. Same arrangement as
 * getPopularListings, against an endpoint that exposes only card data.
 * Uncached, so a bundle that has just become unavailable stops being
 * showcased on the next load rather than on the next deploy.
 */
export async function getFeaturedBundles(limit = 8): Promise<FeaturedBundleCard[]> {
  const apiBase = (
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  ).replace(/\/+$/, "");
  const response = await fetch(`${apiBase}/bundles/featured?limit=${limit}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Featured bundles are temporarily unavailable.");
  return response.json() as Promise<FeaturedBundleCard[]>;
}
