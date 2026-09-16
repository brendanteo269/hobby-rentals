/**
 * Listings API client for the frontend.
 *
 * Mirrors the FastAPI routes in app/routers/listings.py. Shapes and display
 * labels live in @/lib/listings so client components can read them too; this
 * module is the server-only half that actually talks to the backend.
 */

import "server-only";

import { backendRequest } from "@/lib/api/client";
import type {
  BrowseListingsResponse,
  CreateListingRequest,
  Listing,
  ListingCategory,
  ListingCondition,
  LocationArea,
  PresignPhotoResponse,
} from "@/lib/listings";

export { BackendApiError as ListingApiError } from "@/lib/api/client";

/**
 * Browse filters, as the backend expects them.
 *
 * Values within one list are OR'd (a listing matching any selected category
 * qualifies); the lists are AND'd against each other. start_date and end_date
 * only take effect together — the backend ignores a lone one.
 */
export type BrowseListingsParams = {
  q?: string;
  category?: ListingCategory[];
  condition?: ListingCondition[];
  brand?: string[];
  location_area?: LocationArea[];
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
};

function browseQuery(params: BrowseListingsParams): string {
  const search = new URLSearchParams();

  // Repeated key per value: FastAPI reads list query params that way, and it
  // keeps values carrying a comma (a brand name, say) from being split.
  const appendAll = (key: string, values: string[] | undefined) =>
    values?.forEach((value) => search.append(key, value));

  if (params.q) search.set("q", params.q);
  appendAll("category", params.category);
  appendAll("condition", params.condition);
  appendAll("brand", params.brand);
  appendAll("location_area", params.location_area);
  if (params.start_date) search.set("start_date", params.start_date);
  if (params.end_date) search.set("end_date", params.end_date);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.page_size) search.set("page_size", String(params.page_size));

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Active listings only; drafts and archived ones are never returned here. */
export function browseListings(params: BrowseListingsParams = {}) {
  return backendRequest<BrowseListingsResponse>(`/listings${browseQuery(params)}`);
}

/** Creates the listing and publishes it to the marketplace in one step. */
export function createListing(data: CreateListingRequest) {
  return backendRequest<Listing>("/listings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * The signed-in owner's full rental inventory — every status, newest first.
 * Unlike browseListings, this includes drafts and archived listings, since
 * it is the owner managing their own gear rather than a renter searching.
 */
export function getMyListings() {
  return backendRequest<Listing[]>("/listings/mine");
}

export type ListingAvailability = {
  has_custom_availability: boolean;
  weekly_schedule: number[];
  blackouts: { id: string; start_date: string; end_date: string; reason?: string | null }[];
  confirmed_bookings: { id: string; start_date: string; end_date: string; status: string }[];
};

export function getListingAvailability(listingId: string) {
  return backendRequest<ListingAvailability>(`/listings/${encodeURIComponent(listingId)}/availability`);
}

export function updateListingAvailability(listingId: string, has_custom_availability: boolean, custom_available_days: number[] | null) {
  return backendRequest(`/listings/${encodeURIComponent(listingId)}/availability`, { method: "PUT", body: JSON.stringify({ has_custom_availability, custom_available_days }) });
}

export function addListingBlackout(listingId: string, start_date: string, end_date: string, reason?: string) {
  return backendRequest(`/listings/${encodeURIComponent(listingId)}/blackouts`, { method: "POST", body: JSON.stringify({ start_date, end_date, reason: reason || null }) });
}

export function deleteListingBlackout(listingId: string, blackoutId: string) {
  return backendRequest(`/listings/${encodeURIComponent(listingId)}/blackouts/${encodeURIComponent(blackoutId)}`, { method: "DELETE" });
}

/**
 * Issues a one-time S3 upload URL for a single photo. The browser PUTs the
 * file straight to that URL itself — this only gets as far as handing back
 * the URL, since backendRequest (and the Supabase session it reads) is
 * server-only and can't run in the client component that owns the file.
 */
export function presignListingPhoto(contentType: string) {
  return backendRequest<PresignPhotoResponse>("/listings/photos/presign", {
    method: "POST",
    body: JSON.stringify({ content_type: contentType }),
  });
}
