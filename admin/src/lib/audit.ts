import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every action the portal is allowed to record.
 *
 * Keyed by the string written to the database, so the stored value and the
 * label shown in the timeline cannot drift apart, and adding an action means
 * adding it here rather than typing a literal at the call site.
 */
export const AUDIT_ACTIONS = {
  verification_email_resent: "Verification email resent",
  verification_reset: "Verification reset",
  wallet_credit_applied: "Manual credit applied",
  wallet_debit_applied: "Manual debit applied",
  passport_viewed: "Product Passport viewed",
  passport_reviewed: "Product Passport reviewed",
  listing_viewed: "Listing viewed",
  listing_deactivated: "Listing deactivated",
  listing_reactivated: "Listing reactivated",
  booking_viewed: "Booking viewed",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/**
 * How an action is attributed while the portal uses one shared password.
 *
 * It describes the door that was opened, not the person who walked through
 * it — there is no way to tell them apart. Restoring per-administrator
 * sign-in is what would make this a name.
 */
const ACTOR_LABEL = "Shared admin session";

export type AuditEntry = {
  id: number;
  action: AuditAction;
  label: string;
  actorLabel: string;
  detail: Record<string, unknown>;
  created_at: string;
};

export const AUDIT_PAGE_SIZE = 10;

export type AuditTrailResult = {
  entries: AuditEntry[];
  total: number;
};

type AuditRow = {
  id: number;
  action: string;
  actor_label: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

/** Falls back to the raw action so an entry written by a later version of the portal still renders. */
function labelFor(action: string): string {
  return AUDIT_ACTIONS[action as AuditAction] ?? action;
}

/** The audit trail for one account, newest first, paginated at AUDIT_PAGE_SIZE. */
export async function getUserAuditTrail(
  userId: string,
  page = 1,
): Promise<AuditTrailResult> {
  const supabase = createAdminClient();
  const offset = (page - 1) * AUDIT_PAGE_SIZE;

  const { data, error, count } = await supabase
    .from("admin_audit_log")
    .select("id, action, actor_label, detail, created_at", { count: "exact" })
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + AUDIT_PAGE_SIZE - 1);

  if (error) {
    console.error("Failed to load audit trail:", error.message);
    return { entries: [], total: 0 };
  }

  return {
    entries: ((data ?? []) as AuditRow[]).map((row) => ({
      id: row.id,
      action: row.action as AuditAction,
      label: labelFor(row.action),
      actorLabel: row.actor_label,
      detail: row.detail ?? {},
      created_at: row.created_at,
    })),
    total: count ?? 0,
  };
}

/**
 * The audit trail for one listing, newest first, paginated at AUDIT_PAGE_SIZE.
 *
 * Listing actions are recorded against the owner (admin_audit_log has no
 * target_listing_id column - see 20260904000001_admin_user_management.sql),
 * with the listing id riding along in detail instead. Scoped to both: an
 * owner's other listings, or other admin actions on their account, must not
 * show up as if they happened to this one.
 */
export async function getListingAuditTrail(
  listingId: string,
  ownerId: string,
  page = 1,
): Promise<AuditTrailResult> {
  const supabase = createAdminClient();
  const offset = (page - 1) * AUDIT_PAGE_SIZE;

  const { data, error, count } = await supabase
    .from("admin_audit_log")
    .select("id, action, actor_label, detail, created_at", { count: "exact" })
    .eq("target_user_id", ownerId)
    .eq("detail->>listing_id", listingId)
    .order("created_at", { ascending: false })
    .range(offset, offset + AUDIT_PAGE_SIZE - 1);

  if (error) {
    console.error("Failed to load listing audit trail:", error.message);
    return { entries: [], total: 0 };
  }

  return {
    entries: ((data ?? []) as AuditRow[]).map((row) => ({
      id: row.id,
      action: row.action as AuditAction,
      label: labelFor(row.action),
      actorLabel: row.actor_label,
      detail: row.detail ?? {},
      created_at: row.created_at,
    })),
    total: count ?? 0,
  };
}

/**
 * The audit trail for one booking, newest first, paginated at AUDIT_PAGE_SIZE.
 *
 * Recorded against the renter (same reasoning as getListingAuditTrail: no
 * target_booking_id column exists), with the booking id riding along in
 * detail instead. Scoped to both for the same reason - a renter's other
 * bookings, or other admin actions on their account, must not show up as if
 * they happened to this one.
 */
export async function getBookingAuditTrail(
  bookingId: string,
  renterId: string,
  page = 1,
): Promise<AuditTrailResult> {
  const supabase = createAdminClient();
  const offset = (page - 1) * AUDIT_PAGE_SIZE;

  const { data, error, count } = await supabase
    .from("admin_audit_log")
    .select("id, action, actor_label, detail, created_at", { count: "exact" })
    .eq("target_user_id", renterId)
    .eq("detail->>booking_id", bookingId)
    .order("created_at", { ascending: false })
    .range(offset, offset + AUDIT_PAGE_SIZE - 1);

  if (error) {
    console.error("Failed to load booking audit trail:", error.message);
    return { entries: [], total: 0 };
  }

  return {
    entries: ((data ?? []) as AuditRow[]).map((row) => ({
      id: row.id,
      action: row.action as AuditAction,
      label: labelFor(row.action),
      actorLabel: row.actor_label,
      detail: row.detail ?? {},
      created_at: row.created_at,
    })),
    total: count ?? 0,
  };
}

/** Skip logging another "viewed" entry this soon after the listing's last audit entry. */
const VIEW_DEDUPE_WINDOW_MS = 10_000;

/**
 * Records "listing_viewed", unless the listing's own moderation action
 * (deactivate/reactivate) just wrote an entry a moment ago.
 *
 * deactivateListingAction/reactivateListingAction both call
 * revalidatePath(ROUTES.listing(id)) on success, which re-renders this page
 * and would otherwise log a second, redundant "viewed" entry right under
 * the action the administrator actually took - the audit trail would read
 * "deactivated" then "viewed" for every single moderation action, rather
 * than once.
 */
export async function recordListingViewed(listingId: string, ownerId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("created_at")
    .eq("target_user_id", ownerId)
    .eq("detail->>listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) console.error("Failed to check listing audit trail:", error.message);

  const lastEntryAt = data ? new Date(data.created_at).getTime() : null;
  if (lastEntryAt !== null && Date.now() - lastEntryAt < VIEW_DEDUPE_WINDOW_MS) return;

  await recordAdminAction("listing_viewed", ownerId, { listing_id: listingId });
}

/** Records "booking_viewed", unless this booking's own audit trail already has an entry this recent (same reasoning as recordListingViewed). */
export async function recordBookingViewed(bookingId: string, renterId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("created_at")
    .eq("target_user_id", renterId)
    .eq("detail->>booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) console.error("Failed to check booking audit trail:", error.message);

  const lastEntryAt = data ? new Date(data.created_at).getTime() : null;
  if (lastEntryAt !== null && Date.now() - lastEntryAt < VIEW_DEDUPE_WINDOW_MS) return;

  await recordAdminAction("booking_viewed", renterId, { booking_id: bookingId });
}

/**
 * Writes an entry to the audit trail.
 *
 * Goes through record_admin_action rather than inserting directly: the table
 * has no insert policy, and the function is what decides whether the caller
 * is allowed to write at all.
 */
export async function recordAdminAction(
  action: AuditAction,
  targetUserId: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("record_admin_action", {
    action,
    target_user_id: targetUserId,
    detail,
    actor_label: ACTOR_LABEL,
  });

  // An action that succeeded but went unrecorded is worth knowing about, but
  // it is not worth failing the action the administrator actually asked for.
  if (error) console.error(`Failed to record "${action}":`, error.message);
}
