"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";
import { runSearchGapCheck } from "@/app/listings/[id]/search-gap-actions";
import { fixFieldId, type SearchGapResult } from "@/lib/search-gaps";

/** Moves the owner to the field a topic points at, falling back to the description. */
function focusField(fix: string) {
  const field = document.getElementById(fixFieldId(fix)) ?? document.getElementById("description");
  field?.scrollIntoView({ behavior: "smooth", block: "center" });
  field?.focus({ preventScroll: true });
}

/**
 * S5-03 AI Search-Gap Check on the edit page. It only reads: the owner makes
 * every change in the form below and saves it, then checks again.
 */
export function SearchGapPanel({ listingId }: { listingId: string }) {
  const [result, setResult] = useState<SearchGapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function check() {
    setError(null);
    startTransition(async () => {
      const response = await runSearchGapCheck(listingId);
      if ("error" in response) setError(response.error);
      else setResult(response.result);
    });
  }

  return (
    <section id="search-visibility" className="card scroll-mt-24 p-5" aria-labelledby="search-visibility-heading">
      <p className="eyebrow">Search visibility</p>
      <h2 id="search-visibility-heading" className="heading mt-1 text-xl">What renters search for that this listing does not say</h2>
      <p className="body-copy mt-1">
        Compares your saved listing with renter searches in its category over the last 90 days. Nothing is changed for you.
      </p>
      <Button type="button" variant="outline" className="mt-4" disabled={pending} onClick={check}>
        {pending ? "Checking…" : result ? "Check again" : "Check search visibility"}
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
            <p className="text-ink-soft">Based on {result.relevant_searches} renter searches this listing could appear for.</p>
          ) : (
            <p className="rounded-xl border border-line bg-sand p-3">
              There is not enough search data in this category yet, so this score only shows how complete your
              specifications are.
            </p>
          )}

          {result.missing.length > 0 ? (
            <div>
              <h3 className="font-medium">{result.enough_search_data ? "Missing topics" : "Empty specifications"}</h3>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {result.missing.map((topic) => (
                  <li key={topic.label} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {topic.label}
                        {topic.search_count > 0 && <span className="ml-2 font-normal text-ink-soft">{topic.search_count} searches</span>}
                      </p>
                      {topic.examples.length > 0 && (
                        <p className="mt-1 text-ink-soft">{topic.examples.map((example) => `“${example}”`).join(", ")}</p>
                      )}
                      <p className="mt-1 text-xs text-ink-soft">{topic.fix_label}</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => focusField(topic.fix)}>Fill this</Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No gaps found. Your listing answers what renters search for.</p>
          )}

          {result.covered.length > 0 && (
            <div>
              <h3 className="font-medium">Already covered</h3>
              <ul className="mt-2 space-y-1">
                {result.covered.map((topic) => (
                  <li key={topic.label} className="flex items-center gap-2 text-ink-soft">
                    <Check className="size-4 shrink-0 text-accent-dark" aria-hidden="true" />
                    <span>{topic.label}</span>
                    <span className="text-xs">{topic.search_count} searches</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
