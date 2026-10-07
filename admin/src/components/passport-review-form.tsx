"use client";

import { useActionState } from "react";
import { Button, FormMessage, Panel, RequiredMark, Textarea } from "./ui";
import { submitPassportReview, type PassportReviewState } from "@/app/listings/[id]/passport/actions";

/**
 * S2-35: the decision on a DUPLICATE passport. Two submit buttons share one
 * reason; the clicked button's name/value carries the decision.
 */
export function PassportReviewForm({ listingId, ownerId }: { listingId: string; ownerId: string }) {
  const [state, action, pending] = useActionState<PassportReviewState, FormData>(submitPassportReview, undefined);

  return (
    <Panel
      title="Review duplicate serial"
      description="Approve if this is a legitimate item (e.g. a misread label or a resold item with proof). Reject to take the listing off the marketplace for good. The decision is permanent and is added to the passport's history."
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const verb = submitter?.value === "REJECTED" ? "Reject this serial and unpublish the listing" : "Approve this serial";
          if (!window.confirm(`${verb}? This can't be undone.`)) event.preventDefault();
        }}
      >
        <input type="hidden" name="listing_id" value={listingId} />
        <input type="hidden" name="owner_id" value={ownerId} />

        <div>
          <label htmlFor="reason" className="block text-sm font-medium">
            Reason
            <RequiredMark />
          </label>
          <Textarea
            id="reason"
            name="reason"
            required
            maxLength={1000}
            rows={3}
            className="mt-2"
            placeholder="What you checked and why. The owner sees this on their passport."
          />
        </div>

        <FormMessage state={state} />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" name="decision" value="APPROVED" disabled={pending}>
            Approve
          </Button>
          <Button type="submit" name="decision" value="REJECTED" variant="outline" disabled={pending}>
            Reject
          </Button>
        </div>
      </form>
    </Panel>
  );
}
