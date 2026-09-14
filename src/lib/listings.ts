/**
 * Listing vocabulary: the shape of a listing and the words shown for it.
 *
 * Deliberately free of `server-only` and of any transport code, because both
 * the browse filters (rendered on the server) and the create form (a client
 * component, for its pending state) need these labels. The calls themselves
 * live in @/lib/api/listings.
 *
 * The enums mirror app/listing_service.py. They are duplicated rather than
 * derived because the backend is a separate deployable: a value added there
 * should fail type-checking here until this file gets it, which is the
 * reminder that it needs a label too.
 */

export type ListingCategory =
  | "PHOTOGRAPHY_VIDEOGRAPHY"
  | "CAMPING_OUTDOOR"
  | "HIKING"
  | "POWER_TOOLS_DIY"
  | "SPORTS_FITNESS"
  | "MUSIC_AUDIO"
  | "GAMING_TECH"
  | "EVENTS_PARTY"
  | "COOKING_BAKING"
  | "GARDENING";

export type ListingCondition = "NEW" | "GOOD" | "FAIR" | "POOR";

export type LocationArea = "NORTH" | "SOUTH" | "EAST" | "WEST" | "CENTRAL";

export type ListingStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

/**
 * Recurring unavailability on a listing. One-off ranges live here too, so an
 * owner blocking a single trip and an owner blocking every Sunday use the same
 * field. Weekdays are 0 = Monday … 6 = Sunday, matching the backend.
 */
export type BlackoutRule =
  | { type: "DATE_RANGE"; start: string; end: string }
  | { type: "WEEKLY"; weekdays: number[] }
  | { type: "ANNUAL"; start_month_day: string; end_month_day: string };

/** One card in the browse grid. Deliberately slimmer than `Listing`. */
export type ListingCard = {
  id: string;
  name: string;
  category: ListingCategory;
  /** Object key, not a URL: image hosting is not wired up yet. */
  primary_photo_key: string | null;
  price_per_day_cents: number;
  deposit_cents: number;
  location_area: LocationArea;
};

export type BrowseListingsResponse = {
  results: ListingCard[];
  /** Matches every applied filter, not just the current page. */
  total_count: number;
  page: number;
  page_size: number;
};

/** A listing in full, as returned when one is created. */
export type Listing = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  category: ListingCategory;
  brand: string;
  condition: ListingCondition;
  location_area: LocationArea;
  price_per_day_cents: number;
  price_per_week_cents: number | null;
  deposit_cents: number;
  min_rental_days: number | null;
  max_rental_days: number | null;
  available_from: string;
  available_until: string | null;
  blackout_dates: BlackoutRule[];
  photo_keys: string[];
  status: ListingStatus;
  created_at: string;
  updated_at: string;
};

export type CreateListingRequest = {
  name: string;
  description: string;
  brand: string;
  category: ListingCategory;
  condition: ListingCondition;
  location_area: LocationArea;
  /** Non-negative integer cents, validated by FastAPI. */
  price_per_day_cents: number;
  deposit_cents: number;
  price_per_week_cents?: number | null;
  min_rental_days?: number | null;
  max_rental_days?: number | null;
  /** ISO date (YYYY-MM-DD). Omitting available_until means indefinitely. */
  available_from: string;
  available_until?: string | null;
  blackout_dates?: BlackoutRule[];
  photo_keys?: string[];
};

// Display vocabulary --------------------------------------------------------
// The backend stores machine tokens; these are what a member reads. Kept in
// one place so a filter chip, a select option and a card all say the same word.

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  PHOTOGRAPHY_VIDEOGRAPHY: "Photography & video",
  CAMPING_OUTDOOR: "Camping & outdoor",
  HIKING: "Hiking",
  POWER_TOOLS_DIY: "Power tools & DIY",
  SPORTS_FITNESS: "Sports & fitness",
  MUSIC_AUDIO: "Music & audio",
  GAMING_TECH: "Gaming & tech",
  EVENTS_PARTY: "Events & party",
  COOKING_BAKING: "Cooking & baking",
  GARDENING: "Gardening",
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const LOCATION_LABELS: Record<LocationArea, string> = {
  NORTH: "North",
  SOUTH: "South",
  EAST: "East",
  WEST: "West",
  CENTRAL: "Central",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ListingCategory[];
export const CONDITIONS = Object.keys(CONDITION_LABELS) as ListingCondition[];
export const LOCATION_AREAS = Object.keys(LOCATION_LABELS) as LocationArea[];

/** Monday-first, matching the backend's 0 = Monday weekday numbering. */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isCategory(value: string): value is ListingCategory {
  return value in CATEGORY_LABELS;
}

export function isCondition(value: string): value is ListingCondition {
  return value in CONDITION_LABELS;
}

export function isLocationArea(value: string): value is LocationArea {
  return value in LOCATION_LABELS;
}
