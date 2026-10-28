import Link from "next/link";
import type { Route } from "next";
import { Sparkles } from "lucide-react";

/**
 * Searches a renter can tap to see that the box understands a plain
 * description, not just item names. Each one is known to find the right
 * listing first on the shared marketplace, without naming it.
 */
export const SEARCH_EXAMPLES = [
  "coffee like a barista",
  "keep kids busy at a party",
  "percussion for busking",
  "hem my trousers",
  "camping on a rainy weekend",
];

/** The line under a search box that says it searches by meaning. */
export function SmartSearchNote() {
  return (
    <p className="flex items-center gap-1.5 text-sm text-ink-soft">
      <Sparkles className="size-4 shrink-0 text-accent" aria-hidden="true" />
      <span>
        <span className="font-medium text-ink">Smart search</span> · describe what you need in your own words. We
        match on meaning, not just keywords.
      </span>
    </p>
  );
}

/**
 * The examples as chips. `hrefFor` builds each one's link, so a page can keep
 * its own filters on the search.
 */
export function SearchExamples({ hrefFor }: { hrefFor: (q: string) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-soft">Try:</span>
      {SEARCH_EXAMPLES.map((q) => (
        <Link
          key={q}
          href={hrefFor(q) as Route}
          className="rounded-full border border-line bg-white px-3 py-1 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {q}
        </Link>
      ))}
    </div>
  );
}
