import { Star } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { ReviewCollection } from "@/lib/reviews";
import { PublishedReviewCard } from "./published-review-card";

/** Detail-page review summary for one exact rental experience. */
export function RentalReviewSection({
  title,
  reviews,
  emptyBody,
}: {
  title: string;
  reviews: ReviewCollection;
  emptyBody: string;
}) {
  return (
    <section className="mt-16 border-t border-line pt-10">
      <h2 className="heading text-lg">{title}</h2>
      {reviews.count === 0 ? (
        <div className="mt-5">
          <EmptyState icon={Star} title="No reviews yet" body={emptyBody} />
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <span className="flex items-center gap-0.5" aria-label={`${reviews.average?.toFixed(1)} out of 5 stars`}>
              <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
              <span className="font-medium text-ink">{reviews.average?.toFixed(1)}</span>
            </span>
            <span>·</span>
            <span>{reviews.count} {reviews.count === 1 ? "review" : "reviews"}</span>
          </div>
          <ul className="mt-5 space-y-3">
            {reviews.reviews.map((review) => (
              <li key={review.id}><PublishedReviewCard review={review} showRental={false} /></li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
