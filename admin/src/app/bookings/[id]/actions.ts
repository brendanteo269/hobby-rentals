"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/routes";

export type ResolveHandoverState = { error?: string; success?: string } | undefined;

/** The database prefixes the refusals the UI cares about with a code ("TOO_LATE: …"); the code is for the database, not the admin. */
const ERROR_CODE_PREFIX = /^[A-Z_]+: /;

const FUNCTION_BY_INTENT = {
  start: "admin_start_unconfirmed_rental",
  cancel: "admin_cancel_unconfirmed_booking",
} as const;

const SUCCESS_BY_INTENT = {
  start: "Rental started. The renter and the owner have been told.",
  cancel: "Booking cancelled and the holds released to the renter. The renter and the owner have been told.",
} as const;

/**
 * Starts or cancels a booking whose handover nobody confirmed (S3-02).
 *
 * The database function does the real work atomically - checks that it is
 * really an unconfirmed handover, and the rules, moves the booking, writes the passport entry or releases the
 * holds, notifies both parties and records the audit entry. This action only
 * parses the form and passes a refusal through, so a decision is recorded
 * exactly once.
 */
export async function resolveUnconfirmedHandover(
  _prev: ResolveHandoverState,
  formData: FormData,
): Promise<ResolveHandoverState> {
  await requirePortalSession();

  const bookingId = String(formData.get("booking_id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expected_updated_at") ?? "") || null;

  if (intent !== "start" && intent !== "cancel") return { error: "Choose whether to start or cancel the booking." };
  if (!reason) return { error: "A reason is required." };

  const { error } = await createAdminClient().rpc(FUNCTION_BY_INTENT[intent], {
    p_booking_id: bookingId,
    p_reason: reason,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) return { error: error.message.replace(ERROR_CODE_PREFIX, "") };

  revalidatePath(ROUTES.booking(bookingId));
  revalidatePath(ROUTES.bookings);
  return { success: SUCCESS_BY_INTENT[intent] };
}

export type EndRentalState = { error?: string; success?: string } | undefined;

const END_SUCCESS = {
  REFUND_RENTER: "Rental ended and every hold released to the renter. The renter and the owner have been told.",
  CLOSE_AS_RETURNED:
    "Rental marked as returned. The claim window is open and it settles as usual. The renter and the owner have been told.",
} as const;

/**
 * S3-11: ends an active rental that the return process cannot - neither party
 * can cancel it once it is handed over, so platform support decides. Refund
 * the renter in full, or close it as returned so the claim window and
 * settlement run as usual. As with the handover resolution, the database does
 * the work in one transaction and this only parses the form.
 */
export async function endActiveRental(_prev: EndRentalState, formData: FormData): Promise<EndRentalState> {
  await requirePortalSession();

  const bookingId = String(formData.get("booking_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expected_updated_at") ?? "") || null;

  if (outcome !== "REFUND_RENTER" && outcome !== "CLOSE_AS_RETURNED") {
    return { error: "Choose whether to refund the renter or close the rental as returned." };
  }
  if (!reason) return { error: "A reason is required." };

  const { error } = await createAdminClient().rpc("admin_end_active_rental", {
    p_booking_id: bookingId,
    p_outcome: outcome,
    p_reason: reason,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) return { error: error.message.replace(ERROR_CODE_PREFIX, "") };

  revalidatePath(ROUTES.booking(bookingId));
  revalidatePath(ROUTES.bookings);
  return { success: END_SUCCESS[outcome] };
}
