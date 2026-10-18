"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "./ui";

const QUERY_DEBOUNCE_MS = 350;

function buildSearch(q: string, from: string, to: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  // Omitted on purpose: any change here is a new search, so it always starts
  // back at page one rather than wherever the previous search's pages left off.
  const search = params.toString();
  return search ? `?${search}` : "";
}

/**
 * Live search for the escrow list - same shape as BookingSearch, with a
 * created-between date range in place of the status filter.
 *
 * The text box debounces so a fast typist doesn't fire a lookup per
 * keystroke; a date applies the moment it is picked, since choosing one is
 * already a single deliberate action.
 */
export function EscrowSearch({ query, from: initialFrom, to: initialTo }: { query: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(query);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(nextQ: string, nextFrom: string, nextTo: string) {
    // typedRoutes can't verify a string built from filter values against the
    // route tree - this is always the escrow path plus a query string.
    router.replace(`${pathname}${buildSearch(nextQ, nextFrom, nextTo)}` as Route, { scroll: false });
  }

  function onQueryChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(value, from, to), QUERY_DEBOUNCE_MS);
  }

  function onFromChange(value: string) {
    setFrom(value);
    navigate(q, value, to);
  }

  function onToChange(value: string) {
    setTo(value);
    navigate(q, from, value);
  }

  // Flushes any pending debounce on unmount, so a quick type-then-navigate-away
  // doesn't fire a now-pointless update after the page is already gone.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const hasFilters = Boolean(q || from || to);

  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        navigate(q, from, to);
      }}
    >
      <div className="min-w-64 flex-1">
        <label htmlFor="q" className="block text-sm font-medium">
          Find an escrow record
        </label>
        <Input
          id="q"
          type="search"
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Booking ID, listing, or renter/owner name, email or account ID"
          autoComplete="off"
          className="mt-2"
        />
      </div>

      <div>
        <label htmlFor="from" className="block text-sm font-medium">
          Created from
        </label>
        <Input
          id="from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => onFromChange(event.target.value)}
          className="mt-2"
        />
      </div>

      <div>
        <label htmlFor="to" className="block text-sm font-medium">
          Created to
        </label>
        <Input
          id="to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => onToChange(event.target.value)}
          className="mt-2"
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setFrom("");
            setTo("");
            if (debounceRef.current) clearTimeout(debounceRef.current);
            navigate("", "", "");
          }}
          className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear
        </button>
      )}
    </form>
  );
}
