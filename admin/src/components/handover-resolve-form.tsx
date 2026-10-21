"use client";

import { useActionState, useEffect } from "react";
import { Button, FormMessage, Panel, RequiredMark, Textarea } from "./ui";
import { useToast } from "./toast";
import { resolveUnconfirmedHandover, type ResolveHandoverState } from "@/app/bookings/[id]/actions";

/**
 * How an administrator steps into a confirmed booking whose handover has not
 * gone through (S3-02): neither party can cancel it from the start date, and it
 * cannot start without both confirming. Start it if the item did change hands;
 * cancel it, releasing every hold to the renter, if it did not.
 *
 * The result is a toast: either action moves the booking off Confirmed, so
 * the page stops rendering this panel.
 */
export function HandoverResolveForm({ bookingId, updatedAt }: { bookingId: string; updatedAt: string }) {
  const [state, action, pending] = useActionState<ResolveHandoverState, FormData>(resolveUnconfirmedHandover, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  return (
    <Panel
      title="Resolve the handover"
      description="Use this when the renter and the owner have not both confirmed the handover. Start the rental if the item changed hands, or cancel the booking and release the renter's holds if it did not. Both are recorded in the audit trail and tell the renter and the owner."
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
          const message =
            intent === "cancel"
              ? "Cancel this booking and release every hold - the rental fee and the deposit - back to the renter? This can't be undone."
              : "Start this rental? This can't be undone.";
          if (!window.confirm(message)) event.preventDefault();
        }}
      >
        <input type="hidden" name="booking_id" value={bookingId} />
        {/* What the booking looked like on this page: a change since refuses the action. */}
        <input type="hidden" name="expected_updated_at" value={updatedAt} />
        <div>
          <label htmlFor="reason" className="block text-sm font-medium">
            Reason
            <RequiredMark />
          </label>
          <Textarea
            id="reason"
            name="reason"
            required
            rows={3}
            className="mt-2"
            placeholder="What you found out, for the audit trail."
          />
        </div>

        <FormMessage state={state?.error ? state : undefined} />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" name="intent" value="start" disabled={pending}>
            Start rental
          </Button>
          <Button type="submit" name="intent" value="cancel" variant="outline" disabled={pending}>
            Cancel booking
          </Button>
        </div>
      </form>
    </Panel>
  );
}
