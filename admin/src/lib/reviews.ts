import { createAdminClient } from "@/lib/supabase/admin";

/**
 * S6-12: renters' reviews of a listing, for an administrator to moderate.
 * Removing one keeps it on record (who and why) but takes it off the listing,
 * out of every rating, and out of the listing's "What renters say" summary -
 * a database trigger clears a summary made from it and has it remade in the
 * background.
 */

export const MAX_REMOVAL_REASON_CHARS = 500;

export type AdminListingReview = {
  id: string;
  reviewer_id: string;
  reviewer_name: string | null;
  rating: number;
  body: string;
  published_at: string;
  removed_at: string | null;
  removal_reason: string | null;
};

export type AdminReviewSummary = {
  summary: string | null;
  pros: string[];
  cons: string[];
  review_count: number;
  generated_at: string | null;
  stale: boolean;
  last_error: string | null;
};

export async function getListingReviews(listingId: string): Promise<AdminListingReview[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id,reviewer_id,rating,body,published_at,removed_at,removal_reason")
    .eq("listing_id", listingId)
    .eq("reviewed_role", "OWNER")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.reviewer_id))];
  const names = new Map<string, string | null>();
  if (ids.length) {
    const { data: people } = await supabase.from("profiles").select("id,display_name").in("id", ids);
    for (const person of people ?? []) names.set(person.id, person.display_name);
  }
  return rows.map((row) => ({ ...row, reviewer_name: names.get(row.reviewer_id) ?? null }));
}

export async function getListingReviewSummary(listingId: string): Promise<AdminReviewSummary | null> {
  const { data } = await createAdminClient()
    .from("listing_review_summaries")
    .select("summary,pros,cons,review_count,generated_at,stale,last_error")
    .eq("listing_id", listingId)
    .maybeSingle();
  return data;
}

/** Removes a visible review. Only one not already removed is touched, so a double submit changes nothing. */
export async function removeReview(reviewId: string, reason: string): Promise<{ error?: string; review?: { reviewer_id: string; listing_id: string } }> {
  const { data, error } = await createAdminClient()
    .from("reviews")
    .update({ removed_at: new Date().toISOString(), removal_reason: reason })
    .eq("id", reviewId)
    .is("removed_at", null)
    .select("reviewer_id,listing_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "That review no longer exists or was already removed." };
  return { review: data };
}
