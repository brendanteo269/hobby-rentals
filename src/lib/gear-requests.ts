/**
 * S5-13: the Gear Requests board - the marketplace in reverse.
 *
 * A renter who found nothing posts what they want; owners who have it, listed
 * or archived, offer it. Mirrors app/routers/gear_requests.py.
 */

export type GearRequestStatus = "OPEN" | "FULFILLED" | "CLOSED";

export type GearRequest = {
  id: string;
  renter_id: string;
  title: string;
  details: string | null;
  category: string | null;
  location_area: string | null;
  start_date: string;
  end_date: string;
  max_daily_price_cents: number;
  status: GearRequestStatus;
  fulfilled_by_booking_id: string | null;
  closed_at: string | null;
  created_at: string;
  /** How many owners have answered it. */
  offer_count: number;
};

/** A listing as an offer shows it, and as the owner picks it. */
export type OfferedListing = {
  id: string;
  name: string;
  status: string;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number | null;
  primary_photo_url: string | null;
};

export type GearRequestOffer = {
  id: string;
  listing_id: string;
  owner_id: string;
  /** Null where the owner has not set a display name. */
  owner_display_name: string | null;
  message: string | null;
  created_at: string;
  listing: OfferedListing | null;
};

export type GearRequestDetail = {
  request: GearRequest;
  offers: GearRequestOffer[];
  /** The viewer's own listings they could offer; empty for the renter who posted it. */
  offerable: OfferedListing[];
};

export const GEAR_REQUEST_STATUS_LABELS: Record<GearRequestStatus, string> = {
  OPEN: "Open",
  FULFILLED: "Booked",
  CLOSED: "Closed",
};

/**
 * The listing with the requested dates already chosen.
 *
 * The renter wrote those dates into the request; making them pick again on
 * the listing is asking twice for the same answer.
 */
export function offeredListingHref(listingId: string, request: Pick<GearRequest, "start_date" | "end_date">): string {
  return `/listings/${encodeURIComponent(listingId)}?start=${request.start_date}&end=${request.end_date}`;
}
