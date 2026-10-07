import { adminApiKey, apiUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const QUEUE_LIMIT = 50;

export type PassportEntry = {
  id: string;
  entry_type: string;
  /** Null for an ADMIN_REVIEW: the portal's shared password names no user. */
  created_by: string | null;
  created_at: string;
  /** Photo name ("front", "serial", ...) -> a viewable, possibly short-lived URL. */
  photo_urls: Record<string, string>;
  data: Record<string, unknown>;
};

/** GET /admin/passports/{id}: everything on record, serial included. */
export type AdminPassport = {
  listing: { id: string; name: string; owner_id: string; status: string };
  serial_number: string | null;
  /**
   * NO_SERIAL: identified by a marks photo. DUPLICATE: serial already on another owner's same-brand listing (S2-32).
   * REJECTED: an admin rejected the duplicate, so the listing can't go live (S2-35).
   * STOLEN: the owner reported it stolen (S2-37).
   */
  serial_status: "PENDING" | "VERIFIED" | "NO_SERIAL" | "DUPLICATE" | "REJECTED" | "STOLEN";
  /** What still blocks publishing, e.g. ["baseline"]. */
  missing: string[];
  /** Newest first. */
  entries: PassportEntry[];
};

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

export type FlaggedPassport = {
  listing_id: string;
  serial_number: string | null;
  listing: { name: string; owner_id: string; status: string };
};

/**
 * S2-35: passports waiting on an admin decision, oldest first so the longest
 * wait is at the top. Only DUPLICATE is flagged today.
 */
export async function listFlaggedPassports(): Promise<{ passports: FlaggedPassport[]; error: string | null }> {
  // ponytail: first QUEUE_LIMIT only; paginate if the queue ever gets that long.
  const { data, error } = await createAdminClient()
    .from("product_passports")
    .select("listing_id, serial_number, listing:listings!inner(name, owner_id, status)")
    .eq("serial_status", "DUPLICATE")
    // A removed listing has nothing left to decide.
    .neq("listing.status", "REMOVED")
    .order("created_at", { ascending: true })
    .limit(QUEUE_LIMIT);
  if (error) {
    console.error("Review queue failed:", error.message);
    return { passports: [], error: "Could not load the review queue." };
  }
  return { passports: (data ?? []) as unknown as FlaggedPassport[], error: null };
}

/** S2-35: approve or reject a DUPLICATE. The API appends the decision to the ledger. */
export async function reviewPassport(
  listingId: string,
  decision: "APPROVED" | "REJECTED",
  reason: string,
): Promise<{ error: string | null }> {
  const response = await fetch(`${apiUrl()}/admin/passports/${encodeURIComponent(listingId)}/review`, {
    method: "POST",
    headers: { "X-Admin-Key": adminApiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ decision, reason }),
    cache: "no-store",
  });
  if (response.ok) return { error: null };
  // 409 (already reviewed, not a duplicate) and 404 carry a plain-English detail.
  const body = await response.json().catch(() => null);
  return { error: typeof body?.detail === "string" ? body.detail : `Review failed: ${response.status}` };
}

export const ENTRY_LABELS: Record<string, string> = {
  BASELINE: "Baseline condition",
  SERIAL_VERIFICATION: "Serial number recorded",
  CONDITION_UPDATE: "Condition update",
  ADMIN_REVIEW: "Admin review",
  PURCHASE_PROOF: "Proof of purchase",
  STOLEN_REPORT: "Reported stolen",
};

export const SERIAL_STATUS: Record<AdminPassport["serial_status"], { label: string; tone: "positive" | "warning" | "critical" }> = {
  VERIFIED: { label: "Verified", tone: "positive" },
  PENDING: { label: "Pending", tone: "warning" },
  NO_SERIAL: { label: "No serial", tone: "warning" },
  DUPLICATE: { label: "Duplicate serial", tone: "critical" },
  REJECTED: { label: "Rejected", tone: "critical" },
  STOLEN: { label: "Reported stolen", tone: "critical" },
};

export const PHOTO_LABELS: Record<string, string> = {
  front: "Front",
  back: "Back",
  high_wear: "High-wear area",
  underside: "Underside",
  serial: "Serial label",
  marks: "Distinguishing marks",
  receipt: "Receipt",
  photo_1: "Photo 1",
  photo_2: "Photo 2",
  photo_3: "Photo 3",
  photo_4: "Photo 4",
};
