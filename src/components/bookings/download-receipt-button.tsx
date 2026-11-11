"use client";

import { useTransition } from "react";
import { ReceiptText } from "lucide-react";
import { fetchBookingReceipt } from "@/app/bookings/receipt-actions";
import { useToast } from "@/components/toast";
import { base64ToBytes, canDownloadReceipt } from "@/lib/receipts";

/**
 * S6-10: downloads the member's PDF receipt for a booking - the renter's copy
 * or the owner's, whichever the signed-in member is; the backend decides.
 * Shown from confirmation on; nothing renders for a request or a cancelled
 * booking. Once the rental is settled the same button gives the updated
 * receipt, with the deposit and the owner's payout.
 */
export function DownloadReceiptButton({
  kind = "single",
  booking,
  className = "",
}: {
  kind?: "single" | "bundle";
  booking: { id: string; status: string };
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();
  if (!canDownloadReceipt(booking)) return null;

  function download() {
    startTransition(async () => {
      const result = await fetchBookingReceipt(kind, booking.id);
      if ("error" in result) {
        show(result.error, "error");
        return;
      }
      const url = URL.createObjectURL(new Blob([base64ToBytes(result.receipt.base64)], { type: result.receipt.contentType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.receipt.filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={isPending}
      title="Download receipt (PDF)"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      <ReceiptText className={`size-4 ${isPending ? "animate-pulse" : ""}`} aria-hidden="true" />
      {isPending ? "Preparing…" : "Receipt"}
    </button>
  );
}
