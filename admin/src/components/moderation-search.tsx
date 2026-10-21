"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "./ui";
import { MultiSelectDropdown } from "./multi-select-dropdown";
import { KIND_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS, type QueueFilters } from "@/lib/moderation";

const QUERY_DEBOUNCE_MS = 350;

function buildSearch(filters: QueueFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  filters.statuses.forEach((value) => params.append("status", value));
  filters.kinds.forEach((value) => params.append("kind", value));
  filters.priorities.forEach((value) => params.append("priority", value));
  // Omitted on purpose: any change here is a new search, so it always starts
  // back at page one rather than wherever the previous search's pages left off.
  const search = params.toString();
  return search ? `?${search}` : "";
}

/**
 * Live search and filters for the moderation queue - the same shape as
 * BookingSearch: a text box that debounces, and checkbox dropdowns that apply
 * the moment one is (un)checked, both updating the URL (router.replace, so
 * filtering doesn't pile up history entries) and so re-rendering the server
 * page with the new results.
 */
export function ModerationSearch({ filters: initial }: { filters: QueueFilters }) {
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState(initial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(next: QueueFilters) {
    // typedRoutes can't verify a string built from arbitrary filter values
    // against the route tree - this one is always /moderation plus a query
    // string, never a different path, so the cast is safe.
    router.replace(`${pathname}${buildSearch(next)}` as Route, { scroll: false });
  }

  function update(change: Partial<QueueFilters>) {
    const next = { ...filters, ...change };
    setFilters(next);
    navigate(next);
  }

  function onQueryChange(value: string) {
    const next = { ...filters, search: value };
    setFilters(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(next), QUERY_DEBOUNCE_MS);
  }

  // Flushes any pending debounce on unmount, so a quick type-then-navigate-away
  // doesn't fire a now-pointless update after the page is already gone.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const hasFilters = Boolean(
    filters.search || filters.statuses.length || filters.kinds.length || filters.priorities.length,
  );

  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        navigate(filters);
      }}
    >
      <div className="min-w-64 flex-1">
        <label htmlFor="q" className="block text-sm font-medium">
          Find a report
        </label>
        <Input
          id="q"
          type="search"
          value={filters.search}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Report ID, reason, reporter, reported user or listing"
          autoComplete="off"
          className="mt-2"
        />
      </div>

      <MultiSelectDropdown
        name="status"
        label="Status"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onChange={(statuses) => update({ statuses: statuses as QueueFilters["statuses"] })}
        noneLabel="Any status"
        allLabel="All statuses"
        noun="statuses"
      />
      <MultiSelectDropdown
        name="kind"
        label="Type"
        options={KIND_OPTIONS}
        selected={filters.kinds}
        onChange={(kinds) => update({ kinds: kinds as QueueFilters["kinds"] })}
        noneLabel="Any type"
        allLabel="All types"
        noun="types"
      />
      <MultiSelectDropdown
        name="priority"
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priorities}
        onChange={(priorities) => update({ priorities: priorities as QueueFilters["priorities"] })}
        noneLabel="Any priority"
        allLabel="All priorities"
        noun="priorities"
      />

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            const cleared: QueueFilters = { search: "", statuses: [], kinds: [], priorities: [] };
            setFilters(cleared);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            navigate(cleared);
          }}
          className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear
        </button>
      )}
    </form>
  );
}
