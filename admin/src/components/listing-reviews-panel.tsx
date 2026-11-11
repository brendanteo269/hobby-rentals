"use client";

import { useActionState, useEffect, useState } from "react";
import { Badge, Button, Panel, Textarea } from "./ui";
import { useToast } from "./toast";
import { removeReviewAction, type ReviewRemovalState } from "@/app/listings/[id]/review-actions";
import { formatDateTime } from "@/lib/format";
import { MAX_REMOVAL_REASON_CHARS, type AdminListingReview, type AdminReviewSummary } from "@/lib/reviews";

/**
 * S6-12: renters' reviews of this listing, with "Remove" for any that break
 * the rules, and the AI summary renters currently see. A removed review stays
 * listed here with why it was removed; renters no longer see it, it no longer
 * counts in the rating, and the summary is remade without it.
 */
export function ListingReviewsPanel({
  listingId,
  reviews,
  summary,
}: {
  listingId: string;
  reviews: AdminListingReview[];
  summary: AdminReviewSummary | null;
}) {
  if (reviews.length === 0) return null;
  const visible = reviews.filter((review) => !review.removed_at).length;
  return (
    <Panel title="Reviews" description={`${visible} shown to renters${reviews.length > visible ? `, ${reviews.length - visible} removed` : ""}.`}>
      <SummaryStatus summary={summary} visible={visible} />
      <ul className="-mx-6 -mb-5 mt-4 divide-y divide-line border-t border-line">
        {reviews.map((review) => (
          <li key={review.id} className="space-y-2 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{review.rating}/5</span>
              <span className="text-ink-soft">
                {review.reviewer_name ?? "Unnamed member"} · {formatDateTime(review.published_at)}
              </span>
              {review.removed_at && <Badge tone="critical">Removed</Badge>}
            </div>
            <p className={`text-sm ${review.removed_at ? "text-ink-soft line-through" : ""}`}>{review.body}</p>
            {review.removed_at ? (
              <p className="border-l-2 border-line bg-sand px-3 py-2 text-sm">
                <span className="font-medium">Removed {formatDateTime(review.removed_at)}: </span>
                {review.removal_reason}
              </p>
            ) : (
              <RemoveForm listingId={listingId} reviewId={review.id} />
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SummaryStatus({ summary, visible }: { summary: AdminReviewSummary | null; visible: number }) {
  if (visible < 3) return <p className="text-sm text-ink-soft">No AI summary: fewer than 3 reviews are shown.</p>;
  if (!summary?.summary) {
    return (
      <p className="text-sm text-ink-soft">
        AI summary: being made{summary?.last_error ? ` (last attempt failed: ${summary.last_error})` : ""}.
      </p>
    );
  }
  return (
    <div className="text-sm">
      <p className="font-medium">
        AI summary of {summary.review_count} reviews{summary.stale ? " (being remade)" : ""}
      </p>
      <p className="mt-1">{summary.summary}</p>
      {summary.pros.length > 0 && <p className="mt-1 text-ink-soft">Pros: {summary.pros.join("; ")}</p>}
      {summary.cons.length > 0 && <p className="text-ink-soft">Cons: {summary.cons.join("; ")}</p>}
    </div>
  );
}

function RemoveForm({ listingId, reviewId }: { listingId: string; reviewId: string }) {
  const [state, action, pending] = useActionState<ReviewRemovalState, FormData>(removeReviewAction, undefined);
  const [open, setOpen] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    const message = state?.success ?? state?.error;
    if (message) show(message, state?.error ? "error" : "success");
  }, [show, state]);

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Remove review
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-3 border-l-2 border-bad bg-sand px-3 py-2">
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="hidden" name="listing_id" value={listingId} />
      <label className="block text-sm">
        <span className="font-medium">Why is it being removed?</span>
        <Textarea name="reason" required maxLength={MAX_REMOVAL_REASON_CHARS} rows={2} className="mt-1" />
      </label>
      <p className="text-sm text-ink">Renters will no longer see this review, and it stops counting in the rating and the AI summary.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Removing…" : "Yes, remove review"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
