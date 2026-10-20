"use client";

import { ConfirmStepButton } from "@/components/bookings/confirm-step-button";
import { confirmReturn } from "@/app/bookings/[id]/return/actions";

/**
 * S3-04: one side's confirmation that a rental's item is back. The server
 * refuses until the renter's return photos are complete.
 */
export function ConfirmReturnButton({ bookingId, className }: { bookingId: string; className?: string }) {
  return (
    <ConfirmStepButton
      label="Confirm return"
      pendingLabel="Confirming…"
      confirm={() => confirmReturn(bookingId)}
      className={className}
    />
  );
}
