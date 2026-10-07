"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "./ui";
import { MultiSelectDropdown } from "./multi-select-dropdown";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS } from "@/lib/bookings";

const QUERY_DEBOUNCE_MS = 350;

function buildSearch(q: string, statuses: string[]): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  statuses.forEach((s) => params.append("status", s));
  // Omitted on purpose: any change here is a new search, so it always starts
  // back at page one rather than wherever the previous search's pages left off.
  const search = params.toString();
  return search ? `?${search}` : "";
}

/**
 * Live search for the booking list - same shape as ListingSearch, minus the
 * category filter (bookings have no category of their own).
 *
 * Typing or changing a filter updates the URL (via router.replace, so
 * filtering doesn't pile up browser-history entries), which re-renders the
 * server page with the new results - no Search button to click. The text
 * box debounces so a fast typist doesn't fire a lookup per keystroke; status
 * applies the moment a box is (un)checked, since picking one is already a
 * single deliberate action.
 */
export function BookingSearch({
  query,
  statuses: initialStatuses,
}: {
  query: string;
  statuses: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(query);
  const [statuses, setStatuses] = useState(initialStatuses);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(nextQ: string, nextStatuses: string[]) {
    // typedRoutes can't verify a string built from arbitrary filter values
    // against the route tree - this one is always /bookings plus a query
    // string, never a different path, so the cast is safe.
    router.replace(`${pathname}${buildSearch(nextQ, nextStatuses)}` as Route, { scroll: false });
  }

  function onQueryChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(value, statuses), QUERY_DEBOUNCE_MS);
  }

  function onStatusesChange(value: string[]) {
    setStatuses(value);
    navigate(q, value);
  }

  // Flushes any pending debounce on unmount, so a quick type-then-navigate-away
  // doesn't fire a now-pointless update after the page is already gone.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const hasFilters = Boolean(q || statuses.length > 0);

  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        navigate(q, statuses);
      }}
    >
      <div className="min-w-64 flex-1">
        <label htmlFor="q" className="block text-sm font-medium">
          Find a booking
        </label>
        <Input
          id="q"
          type="search"
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Booking ID, listing, renter, owner, or status"
          autoComplete="off"
          className="mt-2"
        />
      </div>

      <MultiSelectDropdown
        name="status"
        label="Status"
        options={BOOKING_STATUSES.map((s) => ({ value: s, label: BOOKING_STATUS_LABELS[s] }))}
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
            setStatuses([]);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            navigate("", []);
          }}
          className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear
        </button>
      )}
    </form>
  );
}
