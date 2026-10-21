import { adminApiKey, apiUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTone } from "@/lib/users";

/** Mirrors app/booking_service.py's BookingStatus enum on the backend. */
export type BookingStatus = "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "EXPIRED" | "ACTIVE" | "COMPLETED";

/** PENDING first: it's the status an admin is most often asked to look into. */
export const BOOKING_STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Awaiting owner",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  ACTIVE: "In progress",
  COMPLETED: "Completed",
};

/** Pending is the one state waiting on someone; confirmed/active are the "good" outcome; everything else is a closed, uneventful state. */
export const BOOKING_STATUS_TONE: Record<BookingStatus, StatusTone> = {
  PENDING: "warning",
  CONFIRMED: "positive",
  ACTIVE: "positive",
  COMPLETED: "neutral",
  DECLINED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

/** Falls back to the raw slug so an unrecognised status never renders blank. */
export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status as BookingStatus] ?? status;
}

export function bookingStatusTone(status: string): StatusTone {
  return BOOKING_STATUS_TONE[status as BookingStatus] ?? "neutral";
}

/** Mirrors app/booking_service.py's PaymentStatus enum. Null until the renter's hold is actually placed. */
export type PaymentStatus = "HOLD_PLACED" | "HELD_IN_ESCROW" | "RELEASED";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  HOLD_PLACED: "Funds on hold",
  HELD_IN_ESCROW: "Held in escrow",
  RELEASED: "Hold released",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  HOLD_PLACED: "warning",
  HELD_IN_ESCROW: "positive",
  RELEASED: "neutral",
};

export function paymentStatusLabel(status: string | null): string {
  if (!status) return "No hold placed";
  return PAYMENT_STATUS_LABELS[status as PaymentStatus] ?? status;
}

export function paymentStatusTone(status: string | null): StatusTone {
  if (!status) return "neutral";
  return PAYMENT_STATUS_TONE[status as PaymentStatus] ?? "neutral";
}

/** A row of admin_search_bookings - one booking, with just enough of each party to show in a table. */
export type AdminBookingSummary = {
  id: string;
  listing_id: string;
  listing_name: string;
  renter_id: string;
  renter_display_name: string | null;
  renter_email: string | null;
  owner_id: string;
  owner_display_name: string | null;
  owner_email: string | null;
  status: string;
  start_date: string;
  end_date: string;
  total_amount_cents: number;
  created_at: string;
};

type SearchRow = AdminBookingSummary & { total_count: number };

export const PAGE_SIZE = 25;

export type BookingSearchResult = {
  bookings: AdminBookingSummary[];
  total: number;
  /** Null when the search succeeded. Surfaced rather than thrown so the page can stay up. */
  error: string | null;
};

/**
 * Finds bookings by booking id, listing name, renter display name/email,
 * owner display name/email, or status text, optionally narrowed by a set of
 * statuses.
 *
 * `statuses` passes straight through: empty means "any status"
 * (admin_search_bookings treats an empty or null array as no filter), not
 * "match nothing".
 *
 * The matching happens in admin_search_bookings, which re-checks
 * authorisation itself. A caller without the secret key gets an error and an
 * empty list, never a partial one.
 *
 * Call only behind requirePortalSession(): the client used here carries the
 * secret key and so satisfies that check unconditionally.
 */
export async function searchBookings(
  query: string,
  statuses: string[],
  page = 1,
): Promise<BookingSearchResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_search_bookings", {
    search: query,
    status_filter: statuses,
    result_limit: PAGE_SIZE,
    result_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) {
    console.error("Booking search failed:", error.message);
    return { bookings: [], total: 0, error: "Could not load bookings." };
  }

  const rows = (data ?? []) as SearchRow[];
  let total = rows[0]?.total_count ?? 0;

  // Same "page past the end of the result set" handling as searchListings:
  // total_count rides on every row, so an empty page has nowhere to read it
  // from unless page 1 is re-fetched just for that number.
  if (rows.length === 0 && page > 1) {
    const { data: firstPage, error: firstPageError } = await supabase.rpc("admin_search_bookings", {
      search: query,
      status_filter: statuses,
      result_limit: PAGE_SIZE,
      result_offset: 0,
    });
    if (!firstPageError) total = ((firstPage ?? []) as SearchRow[])[0]?.total_count ?? 0;
  }

  return {
    total,
    bookings: rows,
    error: null,
  };
}

/** A confirmed rental whose start date passed with the handover still unconfirmed (S3-02). */
export type FlaggedHandover = {
  id: string;
  listing_name: string;
  start_date: string;
  flagged_at: string;
};

/**
 * Confirmed bookings flagged by the unconfirmed-handover sweep, oldest first.
 * The flag only asks for a look: the booking stays confirmed until both
 * parties confirm. Failures return an empty list so the search below still
 * renders.
 *
 * Call only behind requirePortalSession(), like searchBookings.
 */
export async function getFlaggedHandovers(): Promise<FlaggedHandover[]> {
  const { data, error } = await createAdminClient()
    .from("bookings")
    .select("id, start_date, handover_flagged_at, listing:listings(name)")
    .eq("status", "CONFIRMED")
    .not("handover_flagged_at", "is", null)
    .order("handover_flagged_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Flagged handover lookup failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    // PostgREST types a to-one embed as an object or, loosely, an array.
    const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
    return {
      id: row.id as string,
      listing_name: (listing?.name as string | undefined) ?? "Unknown listing",
      start_date: row.start_date as string,
      flagged_at: row.handover_flagged_at as string,
    };
  });
}

/** A booking an enforcement against one of its members (S3-24) left for an administrator. */
export type EnforcementFlaggedBooking = {
  id: string;
  listing_name: string;
  status: string;
  start_date: string;
  end_date: string;
  flagged_at: string;
};

/**
 * Bookings left open by a suspension or ban: a rental that is out, or one that
 * could not be ended automatically. They are not cancelled from under the
 * other person; an administrator decides. Oldest first. Failures return an
 * empty list so the search below still renders.
 *
 * Call only behind requirePortalSession(), like searchBookings.
 */
export async function getEnforcementFlaggedBookings(): Promise<EnforcementFlaggedBooking[]> {
  const { data, error } = await createAdminClient()
    .from("bookings")
    .select("id, status, start_date, end_date, enforcement_flagged_at, listing:listings(name)")
    .in("status", ["PENDING", "CONFIRMED", "ACTIVE"])
    .not("enforcement_flagged_at", "is", null)
    .order("enforcement_flagged_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Enforcement-flagged booking lookup failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
    return {
      id: row.id as string,
      listing_name: (listing?.name as string | undefined) ?? "Unknown listing",
      status: row.status as string,
      start_date: row.start_date as string,
      end_date: row.end_date as string,
      flagged_at: row.enforcement_flagged_at as string,
    };
  });
}

/** Where a booking's handover stands, as GET /admin/bookings/{id}/handover answers (S3-02). */
export type HandoverDetails = {
  booking_id: string;
  status: string;
  flagged_at: string | null;
  renter_confirmed_at: string | null;
  owner_confirmed_at: string | null;
  /** IN_PROGRESS or COMPLETED; null before the renter starts the photos. */
  pickup_inspection_status: "IN_PROGRESS" | "COMPLETED" | null;
  pickup_completed_at: string | null;
  /** Short-lived signed URLs: the photos are never publicly readable. */
  pickup_photos: { angle: string; label: string; photo_url: string }[];
};

/**
 * Through the API rather than Supabase, for the signed photo URLs. Null when
 * it cannot be loaded: the page still renders, just without the panel, so a
 * flagged booking can still be acted on.
 */
export async function getHandoverDetails(bookingId: string): Promise<HandoverDetails | null> {
  try {
    const response = await fetch(`${apiUrl()}/admin/bookings/${encodeURIComponent(bookingId)}/handover`, {
      headers: { "X-Admin-Key": adminApiKey() },
      // Signed URLs expire; never serve a cached copy.
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Handover lookup failed:", response.status);
      return null;
    }
    return (await response.json()) as HandoverDetails;
  } catch (error) {
    console.error("Handover lookup failed:", error);
    return null;
  }
}

/** Everything admin_get_booking returns, plus the status timeline and escrow ledger the detail page shows. */
export type AdminBookingDetail = {
  id: string;
  listing_id: string;
  listing_name: string;
  renter_id: string;
  renter_display_name: string | null;
  renter_email: string | null;
  owner_id: string;
  owner_display_name: string | null;
  owner_email: string | null;
  status: string;
  payment_status: string | null;
  start_date: string;
  end_date: string;
  rental_days: number | null;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
  rental_subtotal_cents: number | null;
  platform_fee_bps: number | null;
  platform_fee_cents: number | null;
  deposit_cents: number | null;
  total_amount_cents: number | null;
  damage_protection_selected: boolean;
  damage_protection_fee_cents: number | null;
  damage_coverage_cap_cents: number | null;
  damage_excess_cents: number | null;
  decline_reason: string | null;
  decline_note: string | null;
  respond_by: string | null;
  bundle_booking_id: string | null;
  created_at: string;
  updated_at: string;
  statusEvents: BookingStatusEvent[];
  escrowEntries: EscrowLedgerEntry[];
};

export type BookingStatusEvent = {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_role: "RENTER" | "OWNER" | "SYSTEM";
  reason: string | null;
  created_at: string;
};

export type EscrowLedgerEntry = {
  id: string;
  type: string;
  escrow_component: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
};

/** One booking by id, or null when no such booking exists. */
export async function getBookingById(id: string): Promise<AdminBookingDetail | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_get_booking", { target_id: id });

  if (error) {
    console.error("Booking lookup failed:", error.message);
    return null;
  }

  const rows = (data ?? []) as Omit<AdminBookingDetail, "statusEvents" | "escrowEntries">[];
  const booking = rows[0];
  if (!booking) return null;

  // booking_status_events and wallet_transactions both grant select to
  // authenticated/service_role directly (their RLS is "parties read their
  // own", which the secret-key client bypasses the same way every other
  // service-role read does here) - read straight rather than needing a
  // dedicated RPC, same pattern getListingById uses for blackout dates.
  const [{ data: events, error: eventsError }, { data: ledger, error: ledgerError }] = await Promise.all([
    supabase
      .from("booking_status_events")
      .select("id, from_status, to_status, actor_role, reason, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("wallet_transactions")
      .select("id, type, escrow_component, amount_cents, status, created_at")
      .eq("booking_id", id)
      // S3-10: a settlement's charge, payout and any damage deduction are part of the same escrow story.
      .in("type", [
        "ESCROW_HOLD",
        "ESCROW_RELEASE",
        "RENTAL_CHARGE",
        "RENTAL_PAYOUT",
        "DAMAGE_DEDUCTION",
        "DAMAGE_PAYOUT",
        "OVERDUE_SETTLEMENT",
      ])
      .order("created_at", { ascending: true }),
  ]);

  if (eventsError) console.error("Booking status timeline failed:", eventsError.message);
  if (ledgerError) console.error("Booking escrow ledger failed:", ledgerError.message);

  return {
    ...booking,
    statusEvents: (events ?? []) as BookingStatusEvent[],
    escrowEntries: (ledger ?? []) as EscrowLedgerEntry[],
  };
}
