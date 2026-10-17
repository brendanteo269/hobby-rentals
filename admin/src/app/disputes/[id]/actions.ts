"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { recordAdminAction } from "@/lib/audit";
import { resolveDispute } from "@/lib/disputes";
import { ROUTES } from "@/lib/routes";

export type ResolveDisputeState = { error?: string; success?: string } | undefined;

/**
 * S3-10: decides a damage dispute. The API settles the rental in the same
 * transaction and writes the outcome to the item's passport; this records the
 * decision in the audit trail too, against the renter whose deposit it moved.
 */
export async function submitDisputeResolution(
  _prev: ResolveDisputeState,
  formData: FormData,
): Promise<ResolveDisputeState> {
  await requirePortalSession();

  const disputeId = String(formData.get("dispute_id") ?? "");
  const renterId = String(formData.get("renter_id") ?? "");
  const liable = String(formData.get("liable_party") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const damageCents = Math.round(Number(String(formData.get("damage") ?? "0") || "0") * 100);

  if (liable !== "RENTER" && liable !== "OWNER") return { error: "Say who is liable." };
  if (liable === "RENTER" && (!Number.isFinite(damageCents) || damageCents <= 0)) {
    return { error: "Enter the damage value the renter is liable for." };
  }
  if (!note) return { error: "A note is required: it is the only record of why." };

  const { error } = await resolveDispute(disputeId, liable, liable === "OWNER" ? 0 : damageCents, note);
  if (error) return { error };

  await recordAdminAction("dispute_resolved", renterId, {
    dispute_id: disputeId,
    liable_party: liable,
    damage_cents: liable === "OWNER" ? 0 : damageCents,
    note,
  });
  revalidatePath(ROUTES.dispute(disputeId));
  revalidatePath(ROUTES.disputes);

  return { success: "Resolved. The rental has been settled and the item's passport updated." };
}
