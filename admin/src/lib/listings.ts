import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTone } from "@/lib/users";

/** Mirrors app/listing_service.py's ListingStatus enum on the backend. */
export type ListingStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "PENDING_REMOVAL" | "REMOVED";

/** ACTIVE first: it's the status an admin checks most often. */
export const LISTING_STATUSES: ListingStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED", "PENDING_REMOVAL", "REMOVED"];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Published",
  ARCHIVED: "Archived",
  PENDING_REMOVAL: "Removal scheduled",
  REMOVED: "Removed",
};

/** Published reads as the "it's live" state; a scheduled removal is the one that needs attention. */
export const LISTING_STATUS_TONE: Record<ListingStatus, StatusTone> = {
  DRAFT: "neutral",
  ACTIVE: "positive",
  ARCHIVED: "neutral",
  PENDING_REMOVAL: "warning",
  REMOVED: "critical",
};

/** Falls back to the raw slug so an unrecognised status/category never renders blank. */
export function listingStatusLabel(status: string): string {
  return LISTING_STATUS_LABELS[status as ListingStatus] ?? status;
}

export function listingStatusTone(status: string): StatusTone {
  return LISTING_STATUS_TONE[status as ListingStatus] ?? "neutral";
}

/** Mirrors app/listing_service.py's Condition enum. */
export type ListingCondition = "NEW" | "GOOD" | "FAIR" | "POOR";

export const LISTING_CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

/** Falls back to the raw enum value so an unrecognised condition never renders blank. */
export function listingConditionLabel(condition: string): string {
  return LISTING_CONDITION_LABELS[condition as ListingCondition] ?? condition;
}

/** Mirrors app/listing_service.py's LocationArea enum - Singapore planning areas, not compass regions. */
export const LOCATION_LABELS: Record<string, string> = {
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

/** Falls back to the raw enum value so an unrecognised area never renders blank. */
export function listingLocationLabel(locationArea: string): string {
  return LOCATION_LABELS[locationArea] ?? locationArea;
}

export type CategoryOption = { slug: string; label: string };

/** Every listing category, slug to display label - "Photography & video" rather than PHOTOGRAPHY_VIDEOGRAPHY. */
export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const { data, error } = await createAdminClient()
    .from("listing_categories")
    .select("slug,label")
    .order("display_order");

  if (error) {
    console.error("Failed to load categories:", error.message);
    return [];
  }
  return data ?? [];
}

/** A row of admin_search_listings - one listing, with just enough of its owner to show in a table. */
export type AdminListingSummary = {
  id: string;
  name: string;
  category: string;
  status: string;
  price_per_day_cents: number;
  owner_id: string;
  owner_display_name: string | null;
  owner_email: string | null;
  created_at: string;
};

type SearchRow = AdminListingSummary & { total_count: number };

export const PAGE_SIZE = 25;

export type ListingSearchResult = {
  listings: AdminListingSummary[];
  total: number;
  /** Null when the search succeeded. Surfaced rather than thrown so the page can stay up. */
  error: string | null;
};

/**
 * Finds listings by listing id, item name, owner display name, or owner
 * email, optionally narrowed by a set of categories and/or a set of
 * statuses.
 *
 * `categories` and `statuses` both pass straight through: empty means
 * "any category"/"any status" (admin_search_listings treats an empty or
 * null array as no filter on that column), not "match nothing".
 *
 * The matching happens in admin_search_listings, which re-checks
 * authorisation itself. A caller without the secret key gets an error and an
 * empty list, never a partial one.
 *
 * Call only behind requirePortalSession(): the client used here carries the
 * secret key and so satisfies that check unconditionally.
 */
export async function searchListings(
  query: string,
  categories: string[],
  statuses: string[],
  page = 1,
): Promise<ListingSearchResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_search_listings", {
    search: query,
    category_filter: categories,
    status_filter: statuses,
    result_limit: PAGE_SIZE,
    result_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) {
    console.error("Listing search failed:", error.message);
    return { listings: [], total: 0, error: "Could not load listings." };
  }

  const rows = (data ?? []) as SearchRow[];
  let total = rows[0]?.total_count ?? 0;

  // total_count rides along on every row, so an empty page has nowhere to
  // read it from - indistinguishable, otherwise, from a search with zero
  // matches. That only happens on a page past the end of the result set (a
  // bookmarked or shared link whose matches have since shrunk), so page 1
  // always has rows to read the real total from when one exists.
  if (rows.length === 0 && page > 1) {
    const { data: firstPage, error: firstPageError } = await supabase.rpc("admin_search_listings", {
      search: query,
      category_filter: categories,
      status_filter: statuses,
      result_limit: PAGE_SIZE,
      result_offset: 0,
    });
    if (!firstPageError) total = ((firstPage ?? []) as SearchRow[])[0]?.total_count ?? 0;
  }

  return {
    total,
    listings: rows,
    error: null,
  };
}

/** Everything admin_get_listing returns, plus derived availability info the detail page shows. */
export type AdminListingDetail = {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  condition: string;
  location_area: string;
  price_per_day_cents: number;
  price_per_week_cents: number | null;
  deposit_cents: number;
  min_rental_days: number | null;
  max_rental_days: number | null;
  available_from: string;
  available_until: string | null;
  has_custom_availability: boolean;
  custom_available_days: number[] | null;
  /** Recurring weekly blackout rules, as stored - only its presence is shown, not the rules themselves. */
  blackout_dates: unknown[];
  attributes: Record<string, unknown>;
  photo_keys: string[];
  status: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  owner_display_name: string | null;
  owner_email: string | null;
  /** One-off blackout date ranges on or after today, from listing_blackout_dates. */
  upcomingBlackoutCount: number;
};

/** One listing by id, or null when no such listing exists. */
export async function getListingById(id: string): Promise<AdminListingDetail | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_get_listing", { target_id: id });

  if (error) {
    console.error("Listing lookup failed:", error.message);
    return null;
  }

  const rows = (data ?? []) as Omit<AdminListingDetail, "upcomingBlackoutCount">[];
  const listing = rows[0];
  if (!listing) return null;

  // Defensive: admin_get_listing on a database still running an older copy
  // of the migration (photo_keys was added after the function's first
  // version) won't carry this column at all, not even as null.
  listing.photo_keys ??= [];

  // listing_blackout_dates grants select to authenticated/service_role
  // directly (see 20260915000000_owner_and_listing_availability.sql), so this
  // reads it straight rather than needing a dedicated RPC.
  const today = new Date().toISOString().slice(0, 10);
  const { count, error: blackoutError } = await supabase
    .from("listing_blackout_dates")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", id)
    .gte("end_date", today);

  if (blackoutError) console.error("Blackout count failed:", blackoutError.message);

  return { ...listing, upcomingBlackoutCount: count ?? 0 };
}
