import Link from "next/link";
import type { SearchVisibilityRow } from "@/lib/search-gaps";

/** S5-03 Scenario 7: every listing's latest search visibility, lowest first, each linking to its check. */
export function SearchVisibilityTable({ rows }: { rows: SearchVisibilityRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="card p-5">
      <p className="eyebrow">Search visibility</p>
      <h2 className="heading mt-1 text-xl">How well your listings answer renter searches</h2>
      <p className="body-copy mt-1">From each listing&apos;s latest check. Lowest scores first.</p>
      <ul className="mt-5 divide-y divide-line">
        {rows.map((row) => (
          <li key={row.listing_id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{row.listing_name}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {row.checked_at === null
                  ? "Not checked yet"
                  : row.top_missing_topic
                    ? `Biggest gap: ${row.top_missing_topic}`
                    : "No gaps found"}
                {row.checked_at !== null && row.enough_search_data === false && " · specifications only"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <p className="text-right">{row.score === null ? "—" : <><strong>{row.score}</strong> / 100</>}</p>
              <Link href={`/listings/${row.listing_id}/edit#search-visibility`} className="text-accent-dark underline underline-offset-2">
                {row.checked_at === null ? "Check" : "Check again"}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
