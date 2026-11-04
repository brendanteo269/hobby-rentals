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
import type { BookingPause } from "@/lib/away";
import type { BookingQuote, BookingStatus, DeclineReason } from "@/lib/bookings";
import type { CancellationOutcome } from "@/lib/cancellations";
import type { SettlementState } from "@/lib/settlement";

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
  /** S5-10: a renter may leave this item out, for `optional_deduction_cents` off each rental day. */
  is_optional: boolean;
  optional_deduction_cents: number | null;
  /** S5-10: another of the owner's listings, booked in its place when this one is not free for the dates. */
  alternative: { id: string; name: string; status: ListingStatus } | null;
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
  favourite_count: number;
  is_favourited: boolean;
};

export type BundleFavouriteState = { favourite_count: number; is_favourited: boolean };
export type FavouriteBundle = Bundle & { saved_at: string };
export type BundleFavouriteMutation = { saved: boolean; favourite_count: number };

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
  /** S5-15: the owner's away period, shown as "Not taking bookings ...". */
  booking_pause?: BookingPause | null;
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
  /** S5-10: what leaving optional items out took off the rental. */
  deduction_cents: number;
  /** Optional items not booked: unticked by the renter, or not free for the dates. */
  omitted_items: { listing_id: string; name: string; deduction_per_day_cents: number; reason: "LEFT_OUT" | "UNAVAILABLE" }[];
  /** Every optional item, for the tick boxes: whether it is free for the dates and whether it is in the booking. */
  optional_items: { listing_id: string; name: string; deduction_per_day_cents: number; available: boolean; included: boolean }[];
  /** Backups standing in for items the dates need them for: "Includes <alternative> instead of <item>". */
  substitutions: { item_id: string; item_name: string; alternative_id: string; alternative_name: string }[];
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

/** S5-10: one item of a bundle as the owner sets it. */
export type BundleItemSetting = {
  listing_id: string;
  /** A renter may leave it out; `deduction_cents` is what that takes off each rental day. */
  optional: boolean;
  deduction_cents: number | null;
  /** For a required item: another of the owner's listings, used when this one is not free. */
  alternative_listing_id: string | null;
};

export type CreateBundleRequest = {
  name: string;
  description?: string | null;
  /** At least MIN_BUNDLE_ITEMS, and at least one of them required; FastAPI 422s otherwise. */
  items: BundleItemSetting[];
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
 * `items`, when present, replaces the membership outright.
 */
export type UpdateBundleRequest = Partial<CreateBundleRequest>;

/** A group of one is a listing, not a bundle. Mirrors bundle_service.MIN_BUNDLE_ITEMS. */
/**
 * What an owner's stored bundle is called where it sits beside a cross-owner
 * bundle (S5-08), which is built for a renter from several owners' listings.
 */
export const SINGLE_OWNER_BUNDLE_LABEL = "Single-owner bundle";

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
/** What a bundle booking changed from the template. Names, so it reads right if a listing is renamed. */
export type BundleAdjustments = {
  omitted: { listing_id: string; name: string }[];
  substituted: { item_id: string; item_name: string; alternative_id: string; alternative_name: string }[];
};

export type BundleBooking = {
  id: string;
  bundle_id: string;
  bundle_name: string | null;
  renter_id: string;
  /** Who asked. Null when that member has not set a display name. */
  renter_name: string | null;
  owner_id: string;
  /** Whose bundle it is. Set on the renter's list only. */
  owner_name?: string | null;
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
  /** S5-10: the optional items left out and the backups booked in place of items, by name. */
  adjustments?: BundleAdjustments;
  /** How a cancelled bundle booking was settled. Set on the lists only. */
  cancellation_outcome?: CancellationOutcome | null;
  /** S3-10: as on a single booking. Set on the lists only. */
  returned_at?: string | null;
  settlement_state?: SettlementState | null;
  created_at: string;
  updated_at: string;
};


/**
 * S2-30: one bundle on the landing page's showcase.
 *
 * Card data only — this is the one bundle read an anonymous visitor makes, so
 * it carries nothing the marketplace does not already show publicly.
 */
export type FeaturedBundleItem = {
  id: string;
  name: string;
  category: ListingCategory;
  photo_url: string | null;
};

export type FeaturedBundleCard = {
  id: string;
  name: string;
  description: string | null;
  items: FeaturedBundleItem[];
  item_count: number;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  primary_photo_url: string | null;
};
