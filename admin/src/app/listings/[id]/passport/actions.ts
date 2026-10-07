"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { recordAdminAction } from "@/lib/audit";
import { reviewPassport } from "@/lib/passports";
import { ROUTES } from "@/lib/routes";

export type PassportReviewState = { error?: string; success?: string } | undefined;

/**
 * S2-35: approves or rejects a DUPLICATE passport. The API appends the
 * decision to the passport's ledger; this records it in the audit trail
 * too, against the owner, like passport_viewed.
 */
export async function submitPassportReview(
  _prev: PassportReviewState,
  formData: FormData,
): Promise<PassportReviewState> {
  await requirePortalSession();

  const listingId = String(formData.get("listing_id") ?? "");
  const ownerId = String(formData.get("owner_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Choose approve or reject." };
  if (!reason) return { error: "A reason is required." };

  const { error } = await reviewPassport(listingId, decision, reason);
  if (error) return { error };

  await recordAdminAction("passport_reviewed", ownerId, { listing_id: listingId, decision, reason });
  revalidatePath(ROUTES.listingPassport(listingId));
  revalidatePath(ROUTES.listings);

  return {
    success: decision === "APPROVED" ? "Approved. The serial now counts as verified." : "Rejected. The listing has been taken off the marketplace.",
  };
}
