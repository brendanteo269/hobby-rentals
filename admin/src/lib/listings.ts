import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTone } from "@/lib/users";

/** Mirrors app/listing_service.py's ListingStatus enum on the backend. */
export type ListingStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "PENDING_REMOVAL" | "REMOVED";

/** ACTIVE first: it's the default filter and the status an admin checks most often. */
export const LISTING_STATUSES: ListingStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED", "PENDING_REMOVAL", "REMOVED"];

/** What the status filter shows when nothing has been explicitly chosen - the live listings, not every draft and removal. */
export const DEFAULT_LISTING_STATUSES: ListingStatus[] = ["ACTIVE"];

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
 * email, optionally narrowed by category and/or a set of statuses.
 *
 * `statuses` is the already-resolved filter (the page applies the
 * "default to Published" rule before calling this) - an empty array here
 * means "no listing can match", not "any status", so callers must not pass
 * one expecting "any".
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
  category: string,
  statuses: string[],
  page = 1,
): Promise<ListingSearchResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_search_listings", {
    search: query,
    category_filter: category || null,
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
      category_filter: category || null,
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
