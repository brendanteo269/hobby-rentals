import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { reviewSummaryLabel, type ReviewSummary } from "@/lib/reviews";

/**
 * S6-12: a short AI summary of a listing's reviews - two or three sentences,
 * up to three pros and two cons - labelled with how many reviews it was made
 * from. The backend sends one only for a listing with at least three reviews;
 * without one, nothing renders.
 */
export function WhatRentersSay({ summary }: { summary?: ReviewSummary | null }) {
  if (!summary) return null;
  return (
    <section aria-labelledby="what-renters-say" className="mt-5 rounded-2xl bg-surface-muted p-5 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id="what-renters-say" className="font-medium text-ink">What renters say</h3>
        <p className="flex items-center gap-1 text-xs text-ink-soft">
          <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
          {reviewSummaryLabel(summary)}
        </p>
      </div>
      <p className="mt-2 leading-relaxed text-ink">{summary.summary}</p>
      {(summary.pros.length > 0 || summary.cons.length > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {summary.pros.length > 0 && (
            <ul aria-label="Pros" className="space-y-1">
              {summary.pros.map((pro) => (
                <li key={pro} className="flex items-start gap-2">
                  <ThumbsUp className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          )}
          {summary.cons.length > 0 && (
            <ul aria-label="Cons" className="space-y-1">
              {summary.cons.map((con) => (
                <li key={con} className="flex items-start gap-2">
                  <ThumbsDown className="mt-0.5 size-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
