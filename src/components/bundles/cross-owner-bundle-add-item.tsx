"use client";

import { useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { searchListingsToAdd } from "@/app/bundles/build/actions";
import type { CrossOwnerBundleListing } from "@/lib/cross-owner-bundles";
import { CrossOwnerListingLine } from "./cross-owner-listing-line";

type Outcome = { error: string } | { listings: CrossOwnerBundleListing[] } | null;

/**
 * Lets the renter add an item the suggestion missed (Scenario 4): search for
 * it, and only listings free for the bundle's dates come back, so whatever is
 * added keeps the whole bundle available (Scenario 2).
 */
export function CrossOwnerBundleAddItem({
  startDate,
  endDate,
  origin,
  pickedIds,
  onAdd,
}: {
  startDate: string;
  endDate: string;
  origin?: { lat: number; lng: number };
  pickedIds: Set<string>;
  onAdd: (listing: CrossOwnerBundleListing) => void;
}) {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();

  function search(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    startTransition(async () => {
      setOutcome(
        await searchListingsToAdd({
          q,
          start_date: startDate,
          end_date: endDate,
          origin_lat: origin?.lat,
          origin_lng: origin?.lng,
        }),
      );
    });
  }

  return (
    <section className="card p-4" aria-labelledby="add-item-heading">
      <h2 id="add-item-heading" className="eyebrow">
        Add another item
      </h2>
      <form onSubmit={search} className="mt-3 flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. headlamp"
          maxLength={60}
          aria-label="Search for an item to add"
        />
        <Button type="submit" variant="outline" disabled={pending || query.trim().length < 2} className="shrink-0 gap-1.5">
          <Search className="size-4" aria-hidden="true" />
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>

      <div aria-live="polite">
        {outcome && "error" in outcome && <p className="mt-3 text-sm text-accent-dark">{outcome.error}</p>}
        {outcome && "listings" in outcome && outcome.listings.length === 0 && (
          <p className="body-copy mt-3">Nothing free for these dates matches that.</p>
        )}
        {outcome && "listings" in outcome && outcome.listings.length > 0 && (
          <ul className="mt-4 space-y-4">
            {outcome.listings.map((listing) => (
              <li key={listing.id}>
                <CrossOwnerListingLine listing={listing}>
                  <button
                    type="button"
                    disabled={pickedIds.has(listing.id)}
                    onClick={() => onAdd(listing)}
                    className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-full border border-line px-4 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {pickedIds.has(listing.id) ? "Added" : "Add"}
                  </button>
                </CrossOwnerListingLine>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
