"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui";
import { browseHref, type BrowseFilters, type BrowseSort } from "@/lib/browse-params";

export function ResultsSort({ filters }: { filters: BrowseFilters }) {
  const router = useRouter();
  const hasLocation = filters.origin_lat !== null;
  function change(sort: BrowseSort) {
    if (sort === "nearest" && !hasLocation) return;
    router.replace(browseHref({ ...filters, sort, page: 1 }) as Route, { scroll: false });
  }
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      Sort by
      <Select value={filters.sort} onChange={(event) => change(event.target.value as BrowseSort)} className="w-44 py-2">
        <option value="newest">Newest</option>
        <option value="nearest" disabled={!hasLocation}>Closest{hasLocation ? "" : " (set location first)"}</option>
      </Select>
    </label>
  );
}
