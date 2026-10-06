/**
 * Bundle vocabulary: the shape of a gear bundle and the words shown for it.
 *
 * Free of `server-only` and of any transport code, like @/lib/listings, so the
 * owner's bundle form (a client component) and the renter's bundle page (a
 * server component) can share it. The calls live in @/lib/api/bundles.
 *
 * A bundle is priced exactly as a listing is - per day or per week, with a
 * deposit - so it carries no pricing helpers of its own: rentalQuote and
 * rentalSubtotalCents in @/lib/listings take anything with the two rate
 * fields, which a Bundle has. One rule, not two that could drift.
 */

import type {
  DateRange,
  ListingCategory,
  ListingCondition,
  ListingStatus,
  LocationArea,
  UnavailableReason,
} from "@/lib/listings";
import type { BookingQuote, BookingStatus, DeclineReason } from "@/lib/bookings";

export type BundleStatus = "ACTIVE" | "UNPUBLISHED" | "REMOVED";

export const BUNDLE_STATUS_LABELS: Record<BundleStatus, string> = {
  ACTIVE: "Published",
  UNPUBLISHED: "Unpublished",
  REMOVED: "Removed",
};

/** A component listing, as a bundle carries it. Slimmer than `Listing`. */
export type BundleComponent = {
  id: string;
  name: string;
  category: ListingCategory;
  brand: string;
  /**
   * An ACTIVE bundle's components are all ACTIVE by definition; this matters
   * on an UNPUBLISHED one, where it names the component that caused it.
   */
  status: ListingStatus;
  condition: ListingCondition;
  location_area: LocationArea;
  photo_keys: string[];
  photo_urls: string[];
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number;
};

export type Bundle = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  // A bundle carries at least one of the two, never neither - see
  // CreateBundleRequest below.
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number;
  /** The bundle's own availability, which narrows what its components allow. */
  available_from: string;
  available_until: string | null;
  has_custom_availability: boolean;
  custom_available_days: number[] | null;
  min_rental_days: number | null;
  max_rental_days: number | null;
  blackout_dates: DateRange[];
  status: BundleStatus;
  items: BundleComponent[];
  created_at: string;
  updated_at: string;
};

/**
 * A bundle's calendar. Same contract as a listing's, with one addition: a
 * blocked date names the component responsible, since "which item is
 * unavailable" is the question a renter looking at a group of gear will have.
 */
export type BundleUnavailableDate = {
  date: string;
  reason: UnavailableReason;
  /**
   * Which component blocks this date, or null when the bundle's own window,
   * schedule or blackout does - then no component is at fault.
   */
  listing_id: string | null;
  listing_name: string | null;
};

export type BundleAvailability = {
  available_dates: string[];
  unavailable_dates: BundleUnavailableDate[];
};

/**
 * What a bundle costs for a date range: field-for-field the single-listing
 * booking quote, plus what the same items would have cost booked separately.
 * Being the same shape is what lets one component render both breakdowns.
 */
export type BundleQuote = BookingQuote & {
  start_date: string;
  end_date: string;
  /** Reported, never enforced - the package rate is the owner's to set. */
  components_subtotal_cents: number;
  savings_cents: number;
};

/** One page of the bundle marketplace, mirroring BrowseListingsResponse. */
export type BrowseBundlesResponse = {
  results: Bundle[];
  /** Matches every applied filter, not just the current page. */
  total_count: number;
  page: number;
  page_size: number;
};

export type BundleEvent = {
  id: string;
  bundle_id: string;
  listing_id: string | null;
  listing_name: string | null;
  action: string;
  from_status: string;
  to_status: string;
  created_at: string;
};

/** Falls back to the raw action for anything added later. */
export const BUNDLE_EVENT_LABELS: Record<string, string> = {
  COMPONENT_UNAVAILABLE: "Unpublished — a component stopped being available",
  COMPONENT_RESTORED: "Republished — the component is available again",
  OWNER_AMENDED: "Republished — you amended the bundle",
  OWNER_REMOVED: "Removed by you",
};

export type CreateBundleRequest = {
  name: string;
  description?: string | null;
  /** At least MIN_BUNDLE_ITEMS; FastAPI 422s on fewer. */
  listing_ids: string[];
  /** At least one of the two is required, exactly as for a listing. */
  price_per_day_cents?: number | null;
  price_per_week_cents?: number | null;
  deposit_cents: number;
  available_from: string;
  available_until?: string | null;
  has_custom_availability?: boolean;
  custom_available_days?: number[] | null;
  min_rental_days?: number | null;
  max_rental_days?: number | null;
  blackout_dates?: DateRange[];
};

/**
 * A partial update for PATCH /bundles/{id}. An omitted field is left alone;
 * `listing_ids`, when present, replaces the membership outright.
 */
export type UpdateBundleRequest = Partial<CreateBundleRequest>;

/** A group of one is a listing, not a bundle. Mirrors bundle_service.MIN_BUNDLE_ITEMS. */
export const MIN_BUNDLE_ITEMS = 2;


/** One reservation a bundle booking made, so both parties see what it covers. */
export type BundleBookingComponent = {
  booking_id: string;
  listing_id: string;
  listing_name: string | null;
  status: BookingStatus;
};

/**
 * A renter's request for a whole set.
 *
 * Carries the money the way a Booking does, because it is quoted the same
 * way; `items` are the per-listing reservations it created, which move with
 * it whenever the owner accepts or declines.
 */
export type BundleBooking = {
  id: string;
  bundle_id: string;
  bundle_name: string | null;
  renter_id: string;
  /** Who asked. Null when that member has not set a display name. */
  renter_name: string | null;
  owner_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  rental_days: number | null;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  rental_subtotal_cents: number | null;
  platform_fee_bps: number | null;
  platform_fee_cents: number | null;
  deposit_cents: number | null;
  total_amount_cents: number | null;
  /** When an unanswered request lapses. */
  respond_by?: string | null;
  decline_reason?: DeclineReason | null;
  decline_note?: string | null;
  items: BundleBookingComponent[];
  created_at: string;
  updated_at: string;
};
