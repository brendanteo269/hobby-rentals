"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { confirmReturn } from "@/app/bookings/[id]/return/actions";

/**
 * S3-04: one side's confirmation that a rental's item is back. The server
 * decides whether it is allowed - it refuses until the renter's return photos
 * are complete - and its message is shown as is. The second confirmation
 * returns the booking, so the page is refreshed either way.
 */
export function ConfirmReturnButton({ bookingId, className }: { bookingId: string; className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await confirmReturn(bookingId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <Button className={className ?? "px-3 py-1.5 text-xs"} disabled={isPending} onClick={confirm}>
        {isPending ? "Confirming…" : "Confirm return"}
      </Button>
      {error && <span role="alert" className="max-w-56 text-right text-xs text-accent-dark">{error}</span>}
    </span>
  );
}
