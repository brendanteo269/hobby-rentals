"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { recordAdminAction } from "@/lib/audit";
import { MAX_REMOVAL_REASON_CHARS, removeReview } from "@/lib/reviews";
import { ROUTES } from "@/lib/routes";

export type ReviewRemovalState = { error?: string; success?: string } | undefined;

/**
 * S6-12: removes a review from a listing, with a mandatory reason. The
 * listing's AI summary stops using it at once (a database trigger) and is
 * remade in the background within a minute or two.
 */
export async function removeReviewAction(_prev: ReviewRemovalState, formData: FormData): Promise<ReviewRemovalState> {
  await requirePortalSession();
  const reviewId = String(formData.get("review_id") ?? "");
  const listingId = String(formData.get("listing_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) return { error: "A reason is required to remove a review." };
  if (reason.length > MAX_REMOVAL_REASON_CHARS) return { error: `Keep the reason under ${MAX_REMOVAL_REASON_CHARS} characters.` };

  const { error, review } = await removeReview(reviewId, reason);
  if (error || !review) return { error: error ?? "The review could not be removed." };

  await recordAdminAction("review_removed", review.reviewer_id, { review_id: reviewId, listing_id: review.listing_id, reason });

  revalidatePath(ROUTES.listing(listingId));
  return { success: "Review removed. The listing's summary will be remade without it." };
}
