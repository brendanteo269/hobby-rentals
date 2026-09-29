import { createAdminClient } from "@/lib/supabase/admin";
import { adminApiKey, apiUrl } from "@/lib/env";

export type ListingRow = {
  id: string;
  name: string;
  owner_id: string;
  status: string;
  created_at: string;
};

export type PassportEntry = {
  id: string;
  entry_type: string;
  created_by: string;
  created_at: string;
  /** Photo name ("front", "serial", ...) -> a viewable, possibly short-lived URL. */
  photo_urls: Record<string, string>;
  data: Record<string, unknown>;
};

/** GET /admin/passports/{id}: everything on record, serial included. */
export type AdminPassport = {
  listing: { id: string; name: string; owner_id: string; status: string };
  serial_number: string | null;
  serial_status: "PENDING" | "VERIFIED";
  /** What still blocks publishing, e.g. ["baseline"]. */
  missing: string[];
  /** Newest first. */
  entries: PassportEntry[];
};

export const LISTINGS_LIMIT = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Listings by name (partial) or exact id, newest first, any status. */
export async function searchListings(query: string): Promise<{ listings: ListingRow[]; error: string | null }> {
  // ponytail: first LISTINGS_LIMIT matches only; paginate like searchUsers once there are more.
  let request = createAdminClient()
    .from("listings")
    .select("id, name, owner_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(LISTINGS_LIMIT);
  const q = query.trim();
  if (q) request = UUID.test(q) ? request.eq("id", q) : request.ilike("name", `%${q.replace(/[%_\\]/g, "\\$&")}%`);

  const { data, error } = await request;
  if (error) {
    console.error("Listing search failed:", error.message);
    return { listings: [], error: "Could not load listings." };
  }
  return { listings: data ?? [], error: null };
}

/**
 * Through the API rather than Supabase: the serial label photo is private in
 * S3, and the API is what can sign a URL for it. Null when there's no such listing.
 */
export async function getAdminPassport(listingId: string): Promise<AdminPassport | null> {
  const response = await fetch(`${apiUrl()}/admin/passports/${encodeURIComponent(listingId)}`, {
    headers: { "X-Admin-Key": adminApiKey() },
    // Presigned URLs expire; never serve a cached copy.
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Passport lookup failed: ${response.status}`);
  return response.json();
}

export const ENTRY_LABELS: Record<string, string> = {
  BASELINE: "Baseline condition",
  SERIAL_VERIFICATION: "Serial number verified",
};

export const PHOTO_LABELS: Record<string, string> = {
  front: "Front",
  back: "Back",
  high_wear: "High-wear area",
  underside: "Underside",
  serial: "Serial label",
};
