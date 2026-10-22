"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

export type EscrowOverrideState = { error?: string; success?: string } | undefined;

/** admin_override_escrow prefixes the refusals the UI cares about with a code ("DISPUTE_OPEN: …"); the code is for the database, not the admin. */
const ERROR_CODE_PREFIX = /^[A-Z_]+: /;

/**
 * Releases a rental's held escrow back to the renter (S3-16).
 *
 * The database function does the real work atomically - checks for an open
 * dispute, locks the rows, writes the corrective ledger entry, moves the
 * balances and records the audit entry. This action only parses the form and
 * passes a refusal through; it never touches admin_audit_log directly, so an
 * override is recorded exactly once (the same split as applyWalletAdjustment).
 *
 * expected_status is the state the page was showing, so an override applied to
 * a record that has since changed is refused rather than guessed at.
 */
export async function overrideEscrow(
  _prev: EscrowOverrideState,
  formData: FormData,
): Promise<EscrowOverrideState> {
  await requirePortalSession();

  const escrowId = String(formData.get("escrow_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  // Empty means "everything held"; a bundle has no components, so it is always empty.
  const component = String(formData.get("component") ?? "");
  const expectedStatus = String(formData.get("expected_status") ?? "");

  if (!reason) {
    return { error: "A justification is required." };
  }

  const { data, error } = await createAdminClient().rpc("admin_override_escrow", {
    target_id: escrowId,
    action: "RELEASE_TO_RENTER",
    reason,
    component: component || null,
    expected_status: expectedStatus || null,
  });

  if (error) return { error: error.message.replace(ERROR_CODE_PREFIX, "") };

  // The booking page lists the same ledger; for a bundle id this is a no-op.
  revalidatePath(ROUTES.booking(escrowId));

  const released = (data as { released_amount_cents: number }).released_amount_cents;
  return { success: `Released ${formatMoney(released)} to the renter.` };
}
