"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink, Modal } from "@/components/ui";
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

  function openRemoveConfirm() {
    // A stale error from a previous archive/restore attempt shouldn't
    // resurface inside a dialog about a different action.
    setError(null);
    setConfirmingRemoval(true);
  }

  function closeRemoveConfirm() {
    if (isPending) return; // mid-request: the dialog is the only place the outcome will land
    setConfirmingRemoval(false);
  }

  return (
    <div className="mt-3 space-y-2">
      {message && <p className="text-xs text-ink-soft">{message}</p>}
      {error && !confirmingRemoval && (
        <p role="alert" className="rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-xs text-ink">
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

        {(current.status === "ACTIVE" || current.status === "DRAFT" || current.status === "ARCHIVED") && (
          <>
            <ButtonLink variant="outline" href={`/listings/${current.id}/edit`} className="px-3 py-1.5 text-xs">
              Edit listing
            </ButtonLink>
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={openRemoveConfirm}>
              Remove listing
            </Button>
          </>
        )}
      </div>

      {confirmingRemoval && (
        <Modal title="Remove listing?" onClose={closeRemoveConfirm}>
          <div className="mt-5 flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-2 pt-1.5">
              <p className="text-sm font-medium text-ink">
                Remove &ldquo;{current.name}&rdquo; from the marketplace?
              </p>
              <p className="body-copy">
                It&apos;s hidden from new search results immediately. If a confirmed booking is still
                in progress, removal completes once that booking ends — otherwise it&apos;s removed
                right away. You&apos;d need to create a new listing to offer it again.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" disabled={isPending} onClick={closeRemoveConfirm}>
              Cancel
            </Button>
            <Button type="button" disabled={isPending} onClick={handleRemove}>
              {isPending ? "Removing…" : "Remove listing"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
