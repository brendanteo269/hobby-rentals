"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, FormMessage, Panel, RequiredMark, Textarea } from "./ui";
import { useToast } from "./toast";
import { endActiveRental, type EndRentalState } from "@/app/bookings/[id]/actions";

type Outcome = "REFUND_RENTER" | "CLOSE_AS_RETURNED";

const CONFIRM: Record<Outcome, string> = {
  REFUND_RENTER:
    "End this rental and release every hold - the rental charge and the deposit - back to the renter? The owner gets no payout. This can't be undone.",
  CLOSE_AS_RETURNED:
    "Mark this rental as returned without the return photos? The claim window opens now and the rental settles as usual. This can't be undone.",
};

/**
 * S3-11: how platform support ends an active rental the return process
 * cannot. Neither party can cancel once the item is handed over, so when it
 * was not as described, or the item came back outside the app, this is the
 * way out. Check the pickup photos in the Handover panel above first.
 *
 * The result is a toast: either outcome moves the booking off Active, so the
 * page stops rendering this panel.
 */
export function EndRentalForm({ bookingId, updatedAt }: { bookingId: string; updatedAt: string }) {
  const [state, action, pending] = useActionState<EndRentalState, FormData>(endActiveRental, undefined);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  return (
    <Panel
      title="End this rental"
      description="For an active rental the renter and the owner cannot finish themselves: neither can cancel once the item is handed over. Both outcomes are recorded in the audit trail and tell the renter and the owner."
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          if (outcome && !window.confirm(CONFIRM[outcome])) event.preventDefault();
        }}
      >
        <input type="hidden" name="booking_id" value={bookingId} />
        {/* What the booking looked like on this page: a change since refuses the action. */}
        <input type="hidden" name="expected_updated_at" value={updatedAt} />

        <fieldset>
          <legend className="text-sm font-medium">
            Outcome
            <RequiredMark />
          </legend>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="outcome"
                value="REFUND_RENTER"
                className="mt-1"
                checked={outcome === "REFUND_RENTER"}
                onChange={() => setOutcome("REFUND_RENTER")}
              />
              <span>
                Refund the renter in full
                <span className="block text-ink-soft">
                  The rental failed - not as described, faulty or unusable. Cancels it and releases every hold to the
                  renter; no overdue fee.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="outcome"
                value="CLOSE_AS_RETURNED"
                className="mt-1"
                checked={outcome === "CLOSE_AS_RETURNED"}
                onChange={() => setOutcome("CLOSE_AS_RETURNED")}
              />
              <span>
                Close as returned
                <span className="block text-ink-soft">
                  The item is back, or is not coming back, outside the app. Stops the overdue clock and opens the claim
                  window, so the owner can still claim against the deposit.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="end-reason" className="block text-sm font-medium">
            Reason
            <RequiredMark />
          </label>
          <Textarea
            id="end-reason"
            name="reason"
            required
            rows={3}
            className="mt-2"
            placeholder="What you found out. The renter and the owner see this."
          />
        </div>

        <FormMessage state={state?.error ? state : undefined} />

        <Button type="submit" disabled={pending || !outcome}>
          {outcome === "CLOSE_AS_RETURNED" ? "Close as returned" : "End rental"}
        </Button>
      </form>
    </Panel>
  );
}
