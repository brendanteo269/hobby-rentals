"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { PillSelect } from "./filter-bar";
import { browseHref, type BrowseFilters, type BrowseSort } from "@/lib/browse-params";

export function ResultsSort({ filters }: { filters: BrowseFilters }) {
  const router = useRouter();
  const hasLocation = filters.origin_lat !== null;
  const hasQuery = filters.q !== "";
  function change(sort: BrowseSort) {
    if (sort === "nearest" && !hasLocation) return;
    if (sort === "relevance" && !hasQuery) return;
    router.replace(browseHref({ ...filters, sort, page: 1 }) as Route, { scroll: false });
  }
  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-sm text-ink-soft">
      Sort by
      <PillSelect value={filters.sort} onChange={(event) => change(event.target.value as BrowseSort)}>
        {/* Best match for what the member described: the default once they search. */}
        <option value="relevance" disabled={!hasQuery}>Best match{hasQuery ? "" : " (search first)"}</option>
        <option value="newest">Newest</option>
        <option value="nearest" disabled={!hasLocation}>Closest{hasLocation ? "" : " (set location first)"}</option>
      </PillSelect>
    </label>
  );
}
