"use client";

import { useActionState, useState } from "react";
import { Button, FormMessage, Panel, Textarea } from "./ui";
import {
  deactivateListingAction,
  reactivateListingAction,
  type ListingModerationState,
} from "@/app/listings/[id]/actions";
import { DEACTIVATABLE_STATUSES, type ListingStatus } from "@/lib/listings";

type Props = { listingId: string; status: string; deactivationReason: string | null };

/**
 * S2-23: the two moderation actions an administrator can take on a listing.
 * Renders nothing for a status neither action applies to (DRAFT,
 * PENDING_REMOVAL, REMOVED) - there is nothing to moderate on a listing in
 * one of those states, and an admin-only takedown is not the tool for the
 * owner's own in-progress removal.
 */
export function ListingModerationPanel({ listingId, status, deactivationReason }: Props) {
  const [deactivateState, deactivateAction, deactivating] = useActionState<ListingModerationState, FormData>(
    deactivateListingAction,
    undefined,
  );
  const [reactivateState, reactivateAction, reactivating] = useActionState<ListingModerationState, FormData>(
    reactivateListingAction,
    undefined,
  );
  // Both are consequential (one hides the listing from every renter, the
  // other undoes that) and get the same inline, styled confirmation
  // VerificationPanel uses, rather than window.confirm().
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [confirmingReactivate, setConfirmingReactivate] = useState(false);
  const [reason, setReason] = useState("");

  if (status === "DEACTIVATED") {
    return (
      <Panel title="Moderation" description="This listing was deactivated by an administrator.">
        <form action={reactivateAction} className="space-y-3">
          <input type="hidden" name="listing_id" value={listingId} />
          {deactivationReason && (
            <p className="border-l-2 border-line bg-sand px-3 py-2 text-sm text-ink">
              <span className="font-medium">Reason given: </span>
              {deactivationReason}
            </p>
          )}
          <FormMessage state={reactivateState} />
          {confirmingReactivate ? (
            <div className="space-y-3 border-l-2 border-bad bg-sand px-3 py-2">
              <p className="text-sm text-ink">
                This makes the listing visible to renters again. Reactivate it?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" disabled={reactivating}>
                  {reactivating ? "Reactivating…" : "Yes, reactivate listing"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmingReactivate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => setConfirmingReactivate(true)}>
              Reactivate listing
            </Button>
          )}
        </form>
      </Panel>
    );
  }

  if (!DEACTIVATABLE_STATUSES.includes(status as ListingStatus)) return null;

  return (
    <Panel title="Moderation" description="Removes this listing from public discovery until it's reactivated.">
      <form action={deactivateAction} className="space-y-3">
        <input type="hidden" name="listing_id" value={listingId} />
        <FormMessage state={deactivateState} />
        {confirmingDeactivate ? (
          <div className="space-y-3 border-l-2 border-bad bg-sand px-3 py-2">
            <Textarea
              id="reason"
              name="reason"
              required
              rows={3}
              placeholder="Why is this listing being deactivated? The owner will see this reason."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="outline" disabled={deactivating || !reason.trim()}>
                {deactivating ? "Deactivating…" : "Confirm deactivation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmingDeactivate(false);
                  setReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => setConfirmingDeactivate(true)}>
            Deactivate listing
          </Button>
        )}
      </form>
    </Panel>
  );
}
