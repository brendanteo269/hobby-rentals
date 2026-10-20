"use client";

import { ConfirmStepButton } from "@/components/bookings/confirm-step-button";
import { confirmHandover } from "@/app/bookings/[id]/handover/actions";

/**
 * S3-02: one side's confirmation that the item changed hands. The server
 * refuses until the pickup photos are complete, while the booking is pending,
 * and before the start date.
 */
export function ConfirmHandoverButton({ bookingId, className }: { bookingId: string; className?: string }) {
  return (
    <ConfirmStepButton
      label="Confirm handover"
      pendingLabel="Confirming…"
      confirm={() => confirmHandover(bookingId)}
      className={className}
    />
  );
}
