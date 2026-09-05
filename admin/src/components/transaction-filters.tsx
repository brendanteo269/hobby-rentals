"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { Input, Select } from "./ui";
import { TRANSACTION_TYPES, transactionTypeLabel } from "@/lib/wallets";

/**
 * Search and type filter for one wallet's transaction history.
 *
 * Client-side and live: every keystroke (debounced) and every type change
 * pushes straight into the URL via router.replace, so the filtered view stays
 * linkable and reloadable without a submit step in between.
 */
export function TransactionFilters({ search, type }: { search: string; type: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(search);

  // The URL is the source of truth. Adjusted here, during render, rather than
  // in an effect: an effect would commit the stale value first and only fix
  // it a render later, which is the exact "cascading renders" pattern
  // react-hooks/set-state-in-effect exists to catch.
  const [trackedSearch, setTrackedSearch] = useState(search);
  if (search !== trackedSearch) {
    setTrackedSearch(search);
    setSearchValue(search);
  }

  useEffect(() => {
    if (searchValue === search) return;
    const timer = setTimeout(() => navigate(searchValue, type), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function navigate(nextSearch: string, nextType: string) {
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextType) params.set("type", nextType);
    const query = params.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label htmlFor="search" className="block text-sm font-medium">
          Search description
        </label>
        <Input
          id="search"
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="e.g. a reason, or part of a description"
          autoComplete="off"
          className="mt-2"
        />
      </div>
      <div className="min-w-40">
        <label htmlFor="type" className="block text-sm font-medium">
          Type
        </label>
        <Select
          id="type"
          value={type}
          onChange={(event) => navigate(searchValue, event.target.value)}
          className="mt-2"
        >
          <option value="">All types</option>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {transactionTypeLabel(t).label}
            </option>
          ))}
        </Select>
      </div>
      {(searchValue || type) && (
        <button
          type="button"
          onClick={() => {
            setSearchValue("");
            navigate("", "");
          }}
          className="px-1 pb-3 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Clear
        </button>
      )}
    </div>
  );
}
