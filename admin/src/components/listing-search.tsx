"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "./ui";
import { MultiSelectDropdown } from "./multi-select-dropdown";
import { LISTING_STATUSES, LISTING_STATUS_LABELS, type CategoryOption } from "@/lib/listings";

const QUERY_DEBOUNCE_MS = 350;

function buildSearch(q: string, categories: string[], statuses: string[]): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  categories.forEach((c) => params.append("category", c));
  statuses.forEach((s) => params.append("status", s));
  // Omitted on purpose: any change here is a new search, so it always starts
  // back at page one rather than wherever the previous search's pages left off.
  const search = params.toString();
  return search ? `?${search}` : "";
}

/**
 * Live search for the listing list.
 *
 * Typing or changing a filter updates the URL (via router.replace, so
 * filtering doesn't pile up browser-history entries), which re-renders the
 * server page with the new results - no Search button to click. The text
 * box debounces so a fast typist doesn't fire a lookup per keystroke;
 * category/status apply the moment a box is (un)checked, since picking one
 * is already a single deliberate action.
 *
 * Still a real <form> for structure and Enter-to-apply-now, but submission
 * is intercepted - the live updates above already keep the URL current.
 */
export function ListingSearch({
  query,
  categories: initialCategories,
  statuses: initialStatuses,
  categoryOptions,
}: {
  query: string;
  categories: string[];
  statuses: string[];
  categoryOptions: CategoryOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(query);
  const [categories, setCategories] = useState(initialCategories);
  const [statuses, setStatuses] = useState(initialStatuses);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(nextQ: string, nextCategories: string[], nextStatuses: string[]) {
    // typedRoutes can't verify a string built from arbitrary filter values
    // against the route tree - this one is always /listings plus a query
    // string, never a different path, so the cast is safe.
    router.replace(`${pathname}${buildSearch(nextQ, nextCategories, nextStatuses)}` as Route, { scroll: false });
  }

  function onQueryChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(value, categories, statuses), QUERY_DEBOUNCE_MS);
  }

  function onCategoriesChange(value: string[]) {
    setCategories(value);
    navigate(q, value, statuses);
  }

  function onStatusesChange(value: string[]) {
    setStatuses(value);
    navigate(q, categories, value);
  }

  // Flushes any pending debounce on unmount, so a quick type-then-navigate-away
  // doesn't fire a now-pointless update after the page is already gone.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const hasFilters = Boolean(q || categories.length > 0 || statuses.length > 0);

  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        navigate(q, categories, statuses);
      }}
    >
      <div className="min-w-64 flex-1">
        <label htmlFor="q" className="block text-sm font-medium">
          Find a listing
        </label>
        <Input
          id="q"
          type="search"
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Name, listing ID, owner name, or owner email"
          autoComplete="off"
          className="mt-2"
        />
      </div>

      <MultiSelectDropdown
        name="category"
        label="Category"
        options={categoryOptions.map((c) => ({ value: c.slug, label: c.label }))}
        selected={categories}
        onChange={onCategoriesChange}
        noneLabel="Any category"
        allLabel="All categories"
        noun="categories"
      />

      <MultiSelectDropdown
        name="status"
        label="Status"
        options={LISTING_STATUSES.map((s) => ({ value: s, label: LISTING_STATUS_LABELS[s] }))}
        selected={statuses}
        onChange={onStatusesChange}
        noneLabel="Any status"
        allLabel="All statuses"
        noun="statuses"
      />

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setCategories([]);
            setStatuses([]);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            navigate("", [], []);
          }}
          className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear
        </button>
      )}
    </form>
  );
}
