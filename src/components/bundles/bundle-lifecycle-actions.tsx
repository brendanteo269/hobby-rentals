"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink, Modal } from "@/components/ui";
import { removeMyBundle } from "@/app/listings/mine/bundles/actions";
import type { Bundle } from "@/lib/bundles";

/**
 * Row-level edit/remove controls for one bundle on the owner's dashboard
 * (S2-20 Scenario 3).
 *
 * Holds the bundle's status locally, seeded from the server-rendered row, so
 * a removal shows immediately without waiting on the page's next full
 * render - the same arrangement ListingLifecycleActions uses.
 */
export function BundleLifecycleActions({ bundle }: { bundle: Bundle }) {
  const [current, setCurrent] = useState(bundle);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRemove = () =>
    startTransition(async () => {
      const result = await removeMyBundle(current.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setCurrent(result.bundle);
      setMessage("Bundle removed. Your individual listings are untouched and still bookable.");
      setConfirming(false);
    });

  function openConfirm() {
    // A stale error from an earlier attempt shouldn't resurface inside a
    // dialog about a different action.
    setError(null);
    setConfirming(true);
  }

  function closeConfirm() {
    if (isPending) return; // mid-request: the dialog is the only place the outcome will land
    setConfirming(false);
  }

  if (current.status === "REMOVED") {
    return message ? <p className="mt-3 text-xs text-ink-soft">{message}</p> : null;
  }

  return (
    <div className="mt-3 space-y-2">
      {message && <p className="text-xs text-ink-soft">{message}</p>}
      {error && !confirming && (
        <p role="alert" className="rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-xs text-ink">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <ButtonLink variant="outline" href={`/bundles/${current.id}`} className="px-3 py-1.5 text-xs">
          View
        </ButtonLink>
        <ButtonLink variant="outline" href={`/listings/mine/bundles/${current.id}/edit`} className="px-3 py-1.5 text-xs">
          Edit bundle
        </ButtonLink>
        <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={openConfirm}>
          Remove bundle
        </Button>
      </div>

      {confirming && (
        <Modal title="Remove bundle?" onClose={closeConfirm}>
          <div className="mt-5 flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-2 pt-1.5">
              <p className="text-sm font-medium text-ink">
                Remove &ldquo;{current.name}&rdquo; from the marketplace?
              </p>
              <p className="body-copy">
                Only the bundle goes. Each of its {current.items.length} listings stays published
                and independently bookable. You&apos;d need to create a new bundle to offer the set
                together again.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" disabled={isPending} onClick={closeConfirm}>
              Cancel
            </Button>
            <Button type="button" disabled={isPending} onClick={handleRemove}>
              {isPending ? "Removing…" : "Remove bundle"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
