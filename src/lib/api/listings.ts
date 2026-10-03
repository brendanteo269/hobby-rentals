/**
 * Listings API client for the frontend.
 *
 * Mirrors the FastAPI routes in app/routers/listings.py. Shapes and display
 * labels live in @/lib/listings so client components can read them too; this
 * module is the server-only half that actually talks to the backend.
 */

import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { Booking } from "@/lib/bookings";
import type {
  BaselineAngle,
  BrowseListingsResponse,
  CreateListingRequest,
  Listing,
  OwnerListing,
  ListingCategory,
  ListingCondition,
  ListingCategoryOption,
  LocationArea,
  Passport,
  PhotoKind,
  PresignPhotoResponse,
  SerialClaim,
  SerialExtraction,
  UnavailableDate,
  UpdateListingRequest,
  UpdateListingResponse,
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

/**
 * Creates the listing as a DRAFT, its passport carrying the serial.
 * publishListing takes it live once its baseline is on record too. A 409
 * means the serial is already registered to another listing.
 */
export function createListing(data: CreateListingRequest) {
  return backendRequest<Listing>("/listings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type ListingLimits = {
  /** Basis points (10000 = 100%) a deposit may not exceed of the listing's weekly-equivalent rate. */
  deposit_cap_bps: number;
};

/** Server-enforced listing limits, so the create-listing form can show an owner the deposit cap before they submit, not just reject it after. */
export function getListingLimits() {
  return backendRequest<ListingLimits>("/listings/limits");
}

export function getListingCategories() {
  return backendRequest<ListingCategoryOption[]>("/categories");
}

/**
 * The signed-in owner's full rental inventory — every status, newest first.
 * Unlike browseListings, this includes drafts and archived listings, since
 * it is the owner managing their own gear rather than a renter searching.
 */
export function getMyListings() {
  return backendRequest<OwnerListing[]>("/listings/mine");
}

/** A single listing, any status - the API 404s if this caller can't see it (not ACTIVE and not theirs). */
export function getListing(listingId: string) {
  return backendRequest<Listing>(`/listings/${encodeURIComponent(listingId)}`);
}

/**
 * Edits the caller's own listing. Send only the fields that changed -
 * an unchanged available_from that has already passed would otherwise be
 * re-sent and rejected, since the API cannot tell "same value" from "new value".
 */
export function updateListing(listingId: string, changes: UpdateListingRequest) {
  return backendRequest<UpdateListingResponse>(`/listings/${encodeURIComponent(listingId)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export type ListingHistory = {
  bookings: import("@/lib/bookings").Booking[];
  lifecycle_events: {
    id: string;
    listing_id: string;
    action: string;
    from_status: string;
    to_status: string;
    scheduled_removal_at: string | null;
    created_at: string;
  }[];
};

export function getListingHistory(listingId: string) {
  return backendRequest<ListingHistory>(`/listings/${encodeURIComponent(listingId)}/history`);
}

export function archiveListing(listingId: string) {
  return backendRequest<Listing>(`/listings/${encodeURIComponent(listingId)}/archive`, { method: "POST" });
}

export function restoreListing(listingId: string) {
  return backendRequest<Listing>(`/listings/${encodeURIComponent(listingId)}/restore`, { method: "POST" });
}

export function removeListing(listingId: string) {
  return backendRequest<Listing>(`/listings/${encodeURIComponent(listingId)}/remove`, { method: "POST" });
}

export type ListingAvailability = {
  has_custom_availability: boolean;
  weekly_schedule: number[];
  blackouts: { id: string; start_date: string; end_date: string; reason?: string | null }[];
  confirmed_bookings: { id: string; start_date: string; end_date: string; status: string }[];
};

export type BookingAvailability = {
  available_dates: string[];
  unavailable_dates: UnavailableDate[];
};

/** Dates a renter can currently select, including the listing's schedule and reserved dates. */
export function getBookingAvailability(listingId: string) {
  return backendRequest<BookingAvailability>(`/listings/${encodeURIComponent(listingId)}/booking-availability`);
}

export function getListingAvailability(listingId: string) {
  return backendRequest<ListingAvailability>(`/listings/${encodeURIComponent(listingId)}/availability`);
}

export function updateListingAvailability(listingId: string, has_custom_availability: boolean, custom_available_days: number[] | null) {
  return backendRequest(`/listings/${encodeURIComponent(listingId)}/availability`, { method: "PUT", body: JSON.stringify({ has_custom_availability, custom_available_days }) });
}

/**
 * Blocks a date range on the listing. A blackout outranks an unanswered
 * request, so any PENDING booking it covers is cancelled and returned in
 * `cancelled_bookings` — the owner should be told what they just turned down.
 * A blackout clashing with a CONFIRMED booking is refused instead (409).
 */
export function addListingBlackout(listingId: string, start_date: string, end_date: string, reason?: string) {
  return backendRequest<{ id: string; cancelled_bookings: Booking[] }>(
    `/listings/${encodeURIComponent(listingId)}/blackouts`,
    { method: "POST", body: JSON.stringify({ start_date, end_date, reason: reason || null }) },
  );
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
export function presignListingPhoto(contentType: string, kind: PhotoKind = "listing") {
  return backendRequest<PresignPhotoResponse>("/listings/photos/presign", {
    method: "POST",
    body: JSON.stringify({ content_type: contentType, kind }),
  });
}

/** S2-04: appends the BASELINE passport entry. Keys come from presignListingPhoto(_, "passport"). */
export function recordBaseline(listingId: string, photos: Record<BaselineAngle, string>) {
  return backendRequest(`/listings/${encodeURIComponent(listingId)}/passport/baseline`, {
    method: "POST",
    body: JSON.stringify(photos),
  });
}

/** The owner sees the full passport; anyone else only an ACTIVE listing's, without the serial. */
export function getPassport(listingId: string) {
  return backendRequest<Passport>(`/listings/${encodeURIComponent(listingId)}/passport`);
}

/** S2-05: reads the serial off a photo (a passports/ key). Saves nothing. */
export function extractSerial(photoKey: string) {
  return backendRequest<SerialExtraction>("/listings/serial/extract", {
    method: "POST",
    body: JSON.stringify({ photo_key: photoKey }),
  });
}

/**
 * For listings created before serials were required; new ones send theirs
 * with createListing. A 409 means it's already registered to another listing.
 */
export function confirmSerial(listingId: string, body: SerialClaim) {
  return backendRequest(`/listings/${encodeURIComponent(listingId)}/passport/serial/confirm`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** DRAFT -> ACTIVE. A 422 means the passport is incomplete. */
export function publishListing(listingId: string) {
  return backendRequest<Listing>(`/listings/${encodeURIComponent(listingId)}/publish`, { method: "POST" });
}

/**
 * Publishes a draft once its passport has nothing missing, so the owner can
 * record the baseline and the serial in either order. Returns whether the
 * listing is still a draft afterwards.
 */
export async function publishIfComplete(listingId: string): Promise<boolean> {
  const [listing, passport] = await Promise.all([getListing(listingId), getPassport(listingId)]);
  if (listing.status !== "DRAFT") return false;
  if (passport.missing.length > 0) return true;
  await publishListing(listingId);
  return false;
}
