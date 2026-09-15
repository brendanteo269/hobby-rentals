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
  | "GARDENING"
  | "OTHER";

export type ListingCondition = "NEW" | "GOOD" | "FAIR" | "POOR";

// Real collection areas rather than compass regions - specific enough that a
// renter searching "Tiong Bahru" gets Tiong Bahru, not everything in the
// southern half of the island.
export type LocationArea =
  | "ANG_MO_KIO"
  | "BEDOK"
  | "BISHAN"
  | "BUKIT_BATOK"
  | "BUKIT_MERAH"
  | "BUKIT_PANJANG"
  | "BUKIT_TIMAH"
  | "CHOA_CHU_KANG"
  | "CLEMENTI"
  | "DOWNTOWN_CORE"
  | "EAST_COAST"
  | "GEYLANG"
  | "HOUGANG"
  | "JURONG_EAST"
  | "JURONG_WEST"
  | "KALLANG"
  | "MARINE_PARADE"
  | "NOVENA"
  | "ORCHARD"
  | "PASIR_RIS"
  | "PUNGGOL"
  | "QUEENSTOWN"
  | "SEMBAWANG"
  | "SENGKANG"
  | "SENTOSA"
  | "SERANGOON"
  | "TAMPINES"
  | "TIONG_BAHRU"
  | "TOA_PAYOH"
  | "WOODLANDS"
  | "YISHUN";

export type ListingStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

/**
 * Recurring unavailability on a listing. One-off ranges live here too, so an
 * owner blocking a single trip and an owner blocking every Sunday use the same
 * field. Weekdays are 0 = Monday … 6 = Sunday, matching the backend.
 */
export type BlackoutDate = { id?: string; start_date: string; end_date: string; reason?: string | null };

/** One card in the browse grid. Deliberately slimmer than `Listing`. */
export type ListingCard = {
  id: string;
  name: string;
  category: ListingCategory;
  /** Object key, not a URL: image hosting is not wired up yet. */
  primary_photo_key: string | null;
  // A listing carries at least one of the two, never neither - see
  // CreateListingRequest below - so a card renders whichever it has.
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
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
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  deposit_cents: number;
  min_rental_days: number | null;
  max_rental_days: number | null;
  available_from: string;
  available_until: string | null;
  blackout_dates: unknown[];
  has_custom_availability: boolean;
  custom_available_days: number[] | null;
  photo_keys: string[];
  status: ListingStatus;
  created_at: string;
  updated_at: string;
};

export const ALLOWED_PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const MAX_LISTING_PHOTOS = 8;

/** What POST /listings/photos/presign returns for one photo. */
export type PresignPhotoResponse = {
  upload_url: string;
  photo_key: string;
};

export type CreateListingRequest = {
  name: string;
  description: string;
  brand: string;
  category: ListingCategory;
  condition: ListingCondition;
  location_area: LocationArea;
  deposit_cents: number;
  /**
   * Price per rental block is a choice, not two mandatory fields: at least
   * one of these two must be set (FastAPI 422s otherwise), but neither is
   * required on its own. Non-negative integer cents.
   */
  price_per_day_cents?: number | null;
  price_per_week_cents?: number | null;
  min_rental_days?: number | null;
  max_rental_days?: number | null;
  /** ISO date (YYYY-MM-DD). Omitting available_until means indefinitely. */
  available_from: string;
  available_until?: string | null;
  has_custom_availability?: boolean;
  custom_available_days?: number[] | null;
  initial_blackouts?: BlackoutDate[];
  /** At least one is required (FastAPI 422s on an empty list). */
  photo_keys: string[];
};


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
  OTHER: "Other",
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const LOCATION_LABELS: Record<LocationArea, string> = {
  ANG_MO_KIO: "Ang Mo Kio",
  BEDOK: "Bedok",
  BISHAN: "Bishan",
  BUKIT_BATOK: "Bukit Batok",
  BUKIT_MERAH: "Bukit Merah",
  BUKIT_PANJANG: "Bukit Panjang",
  BUKIT_TIMAH: "Bukit Timah",
  CHOA_CHU_KANG: "Choa Chu Kang",
  CLEMENTI: "Clementi",
  DOWNTOWN_CORE: "Downtown Core",
  EAST_COAST: "East Coast",
  GEYLANG: "Geylang",
  HOUGANG: "Hougang",
  JURONG_EAST: "Jurong East",
  JURONG_WEST: "Jurong West",
  KALLANG: "Kallang",
  MARINE_PARADE: "Marine Parade",
  NOVENA: "Novena",
  ORCHARD: "Orchard",
  PASIR_RIS: "Pasir Ris",
  PUNGGOL: "Punggol",
  QUEENSTOWN: "Queenstown",
  SEMBAWANG: "Sembawang",
  SENGKANG: "Sengkang",
  SENTOSA: "Sentosa",
  SERANGOON: "Serangoon",
  TAMPINES: "Tampines",
  TIONG_BAHRU: "Tiong Bahru",
  TOA_PAYOH: "Toa Payoh",
  WOODLANDS: "Woodlands",
  YISHUN: "Yishun",
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
