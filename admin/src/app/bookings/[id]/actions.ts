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
