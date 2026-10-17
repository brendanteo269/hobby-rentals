"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { approveExtensionRequest, denyExtensionRequest } from "@/app/bookings/actions";
import { formatDate, formatMoney } from "@/lib/format";
import type { ExtensionRequest } from "@/lib/extensions";

/**
 * S3-17 Scenarios 2 and 3: the owner answers a renter's extension request.
 *
 * Renders inline on the booking it belongs to rather than in a dialog, because
 * the decision needs nothing the row does not already show - who the renter
 * is, and which item - beyond the new date and the extra earnings stated here.
 *
 * Either answer refreshes rather than patching the row in place: approving
 * moves the booking's dates and the wallet, denying leaves them alone, and in
 * both cases the request itself has to disappear from the list.
 */
export function ExtensionRequestDecision({ request }: { request: ExtensionRequest }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(answer: typeof approveExtensionRequest | typeof denyExtensionRequest) {
    setError(null);
    startTransition(async () => {
      const result = await answer(request.id);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-2 w-full border border-line bg-white px-3 py-2">
      <p className="text-sm text-ink">
        <span className="font-medium">Extension requested:</span> {request.additional_days} more{" "}
        {request.additional_days === 1 ? "day" : "days"}, to {formatDate(request.new_end_date)}.
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        {request.total_delta_cents > 0
          ? `Approving holds a further ${formatMoney(request.total_delta_cents)} from the renter for the extra days.`
          : "The extra days add nothing to this booking's charges."}{" "}
        Declining keeps the return date at {formatDate(request.previous_end_date)}.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-accent-dark">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <Button className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => decide(approveExtensionRequest)}>
          Approve extension
        </Button>
        <Button
          variant="outline"
          className="px-3 py-1.5 text-xs"
          disabled={isPending}
          onClick={() => decide(denyExtensionRequest)}
        >
          Decline extension
        </Button>
      </div>
    </div>
  );
}
