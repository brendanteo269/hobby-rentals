import { Star } from "lucide-react";
import { PersonAvatar } from "@/components/messages/person-avatar";
import { ImageSlot } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { CONDITION_LABELS } from "@/lib/listings";
import type { PublishedReview } from "@/lib/reviews";

function reviewerRole(reviewedRole: PublishedReview["reviewed_role"]) {
  return reviewedRole === "OWNER" ? "renter" : "owner";
}

/** A read-only reputation entry shared by public and personal profile pages. */
export function PublishedReviewCard({ review }: { review: PublishedReview }) {
  const reviewerName = review.reviewer?.display_name ?? "Member";
  const rental = review.rental_listing;
  const rentalName = rental?.name ?? review.rental_name_snapshot;

  return (
    <article className="border border-line bg-white p-4">
      <div className="flex min-w-0 items-start gap-2">
          <PersonAvatar name={reviewerName} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{reviewerName}</p>
            <p className="text-xs text-ink-soft">
              Review from {reviewerRole(review.reviewed_role)} · {formatDate(review.published_at)}
            </p>
          </div>
      </div>
      <div className="mt-3 flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
        <span className="sr-only">{review.rating} out of 5 stars</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            aria-hidden="true"
            className={`size-4 ${star <= review.rating ? "fill-accent text-accent" : "text-line"}`}
          />
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-ink">{review.body}</p>
      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3">
        <ImageSlot label={rentalName} src={rental?.photo_url ?? undefined} className="size-12 shrink-0 rounded-md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{rentalName}</p>
          {rental && <p className="mt-0.5 text-xs text-ink-soft">{CONDITION_LABELS[rental.condition]}</p>}
        </div>
      </div>
    </article>
  );
}
