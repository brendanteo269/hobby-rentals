"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";
import { runSearchGapCheck } from "@/app/listings/[id]/search-gap-actions";
import { fixFieldId, type SearchGapResult, type SearchGapTopic } from "@/lib/search-gaps";

/** Moves the owner to the field a topic points at, falling back to the description. */
function focusField(fix: string) {
  const field = document.getElementById(fixFieldId(fix)) ?? document.getElementById("description");
  field?.scrollIntoView({ behavior: "smooth", block: "center" });
  field?.focus({ preventScroll: true });
}

function buttonLabel(topic: SearchGapTopic) {
  return topic.fix === "description" ? "Add to description" : topic.fix_label;
}

function searches(count: number) {
  return `${count} renter search${count === 1 ? "" : "es"}`;
}

/**
 * S5-03 AI Search-Gap Check on the edit page. It only reads: the owner writes
 * every change in the form below and saves it, then checks again. The tip it
 * shows is advice on what to state, never text put into the listing.
 */
export function SearchGapPanel({ listingId }: { listingId: string }) {
  const [result, setResult] = useState<SearchGapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<SearchGapTopic | null>(null);
  const [pending, startTransition] = useTransition();

  function check() {
    setError(null);
    setAdding(null);
    startTransition(async () => {
      const response = await runSearchGapCheck(listingId);
      if ("error" in response) setError(response.error);
      else setResult(response.result);
    });
  }

  function add(topic: SearchGapTopic) {
    setAdding(topic);
    focusField(topic.fix);
  }

  return (
    <section id="search-visibility" className="card scroll-mt-24 p-5" aria-labelledby="search-visibility-heading">
      <p className="eyebrow">Search visibility</p>
      <h2 id="search-visibility-heading" className="heading mt-1 text-xl">What renters search for that this listing does not say</h2>
      <p className="body-copy mt-1">
        Compares your saved listing with renter searches in its category over the last 90 days. Nothing is changed for you.
      </p>
      <Button type="button" variant="outline" className="mt-4" disabled={pending} onClick={check}>
        {pending ? "Checking… (about a minute)" : result ? "Check again" : "Check search visibility"}
      </Button>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}

      {result && (
        <div className="mt-5 space-y-5 text-sm" aria-live="polite">
          {result.score !== null && (
            <div>
              <p className="flex items-baseline gap-2">
                <span className="heading text-3xl">{result.score}</span>
                <span className="text-ink-soft">/ 100 {result.enough_search_data ? "search visibility" : "specifications filled in"}</span>
              </p>
              <div className="mt-2 h-2 w-full bg-surface-muted" aria-hidden="true">
                <div className="h-2 bg-accent" style={{ width: `${result.score}%` }} />
              </div>
            </div>
          )}
          {result.enough_search_data ? (
            <p className="text-ink-soft">
              Your listing answers {result.score}% of the {searches(result.relevant_searches)} it could appear for.
              {result.answered_by_name > 0 && ` ${searches(result.answered_by_name)} are answered by its name alone.`}
            </p>
          ) : (
            <p className="rounded-xl border border-line bg-sand p-3">
              There is not enough search data in this category yet, so this score only shows how complete your
              specifications are.
            </p>
          )}

          {result.missing.length > 0 ? (
            <div>
              <h3 className="font-medium">{result.enough_search_data ? "Not in your listing yet" : "Empty specifications"}</h3>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {result.missing.map((topic) => (
                  <li key={topic.label} className="flex flex-col items-start gap-3 py-3 sm:flex-row sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{topic.label}</p>
                      {topic.search_count > 0 && (
                        <p className="mt-1 text-ink-soft">
                          {searches(topic.search_count)}, e.g. {topic.examples.map((example) => `“${example}”`).join(", ")}
                        </p>
                      )}
                      {topic.search_count > 0 && <p className="mt-1">Your listing doesn&apos;t say this. {topic.hint || "If it’s true for your item, say so."}</p>}
                    </div>
                    <Button type="button" variant="outline" onClick={() => add(topic)}>{buttonLabel(topic)}</Button>
                  </li>
                ))}
              </ul>
              {result.enough_search_data && <p className="mt-2 text-xs text-ink-soft">Only add what is true for your item. Renters see exactly what you write.</p>}
            </div>
          ) : (
            <p>No gaps found. Your listing answers what renters search for.</p>
          )}

          {result.covered.length > 0 && (
            <div>
              <h3 className="font-medium">Already in your listing</h3>
              <ul className="mt-2 space-y-2">
                {result.covered.map((topic) => (
                  <li key={topic.label} className="flex items-start gap-2 text-ink-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-dark" aria-hidden="true" />
                    <span>
                      <span className="text-ink">{topic.label}</span>: {searches(topic.search_count)}, e.g.{" "}
                      {topic.examples.slice(0, 2).map((example) => `“${example}”`).join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {adding && (
        <div role="status" className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl items-start justify-between gap-3 card p-4 text-sm shadow-lg">
          <p>
            <span className="font-medium">Adding: {adding.label}. </span>
            {adding.hint || `Fill in ${adding.label} if you know it.`} Save changes when you are done, then check again.
          </p>
          <Button type="button" variant="outline" onClick={() => setAdding(null)}>Done</Button>
        </div>
      )}
    </section>
  );
}
