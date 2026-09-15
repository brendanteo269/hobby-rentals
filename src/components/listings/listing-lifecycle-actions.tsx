"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Listing } from "@/lib/listings";
import { archiveMyListing, removeMyListing, restoreMyListing, type ListingActionResult } from "@/app/listings/mine/actions";

/**
 * Row-level archive/restore/remove controls for one listing on the owner's
 * "My listings" dashboard (S1-12). Holds the listing's current lifecycle
 * state locally, seeded from the server-rendered row, so an action's result
 * (a new status, or the scheduled removal date from Scenario 3) shows
 * immediately without waiting on the page's next full render.
 */
export function ListingLifecycleActions({ listing }: { listing: Listing }) {
  const [current, setCurrent] = useState(listing);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(result: ListingActionResult, successMessage: (listing: Listing) => string) {
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setCurrent(result.listing);
    setMessage(successMessage(result.listing));
  }

  const handleArchive = () =>
    startTransition(async () => {
      apply(await archiveMyListing(current.id), () => "Listing archived. It's hidden from the marketplace until you restore it.");
    });

  const handleRestore = () =>
    startTransition(async () => {
      apply(await restoreMyListing(current.id), () => "Listing restored and live on the marketplace again.");
    });

  const handleRemove = () =>
    startTransition(async () => {
      apply(await removeMyListing(current.id), (l) =>
        l.status === "PENDING_REMOVAL" && l.scheduled_removal_at
          ? `Removal scheduled for ${formatDate(l.scheduled_removal_at)}, once the last confirmed booking concludes. It's already hidden from new search results.`
          : "Listing removed.",
      );
      setConfirmingRemoval(false);
    });

  return (
    <div className="mt-3 space-y-2">
      {message && <p className="text-xs text-ink-soft">{message}</p>}
      {error && (
        <p role="alert" className="border-l-2 border-clay bg-sand px-3 py-2 text-xs text-ink">
          {error}
        </p>
      )}

      {current.status === "PENDING_REMOVAL" && current.scheduled_removal_at && !message && (
        <p className="text-xs text-ink-soft">
          Removal scheduled for {formatDate(current.scheduled_removal_at)}, once the last confirmed booking concludes.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(current.status === "ACTIVE" || current.status === "DRAFT") && (
          <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={handleArchive}>
            Archive
          </Button>
        )}

        {current.status === "ARCHIVED" && (
          <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={handleRestore}>
            Restore
          </Button>
        )}

        {(current.status === "ACTIVE" || current.status === "DRAFT" || current.status === "ARCHIVED") &&
          (confirmingRemoval ? (
            <span className="flex items-center gap-2 text-xs">
              Remove this listing?
              <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={handleRemove}>
                {isPending ? "Removing…" : "Confirm"}
              </Button>
              <button type="button" className="text-ink-soft underline" onClick={() => setConfirmingRemoval(false)} disabled={isPending}>
                Cancel
              </button>
            </span>
          ) : (
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => setConfirmingRemoval(true)}>
              Remove Listing
            </Button>
          ))}
      </div>
    </div>
  );
}
