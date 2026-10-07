"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FormNotice, Modal } from "@/components/ui";
import { cancelRental, previewCancellation } from "@/app/bookings/actions";
import type { BookingStatus } from "@/lib/bookings";
import {
  cancellationLines,
  hasTerms,
  type CancellableKind,
  type CancellationPreview,
  type CancellationRecord,
} from "@/lib/cancellations";
import { formatMoney } from "@/lib/format";
import { profilePath } from "@/lib/routes";

/**
 * The renter's way out of a booking or a whole bundle booking.
 *
 * Opens on the preview - the policy tier, what comes back and what does not -
 * so the renter decides knowing the outcome, then confirms. A pending request
 * is the same flow under its own name ("Withdraw"), refunded in full. On an
 * ACTIVE booking the preview explains that the return process applies
 * instead, and offers nothing to confirm.
 */
export function CancelBookingButton({
  kind,
  id,
  status,
}: {
  kind: CancellableKind;
  id: string;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [done, setDone] = useState<CancellationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // One key per attempt, reused if the renter presses confirm again after a
  // network error, so a retry can never refund twice.
  const attemptKey = useRef<string>("");

  const withdrawing = status === "PENDING";
  const noun = kind === "bundle" ? "bundle booking" : "booking";
  const label = withdrawing ? "Withdraw request" : `Cancel ${kind === "bundle" ? "bundle" : "booking"}`;

  function openDialog() {
    attemptKey.current = crypto.randomUUID();
    setOpen(true);
    setPreview(null);
    setDone(null);
    setError(null);
    startTransition(async () => {
      const result = await previewCancellation(kind, id);
      if ("error" in result) setError(result.error);
      else setPreview(result.preview);
    });
  }

  function close() {
    setOpen(false);
    // The booking, the wallet and the notification count have all moved.
    if (done) router.refresh();
  }

  function confirm(expectedRefundCents: number) {
    setError(null);
    startTransition(async () => {
      const result = await cancelRental(kind, id, attemptKey.current, expectedRefundCents);
      if ("cancellation" in result) {
        setDone(result.cancellation);
        return;
      }
      setError(
        result.code === "QUOTE_CHANGED"
          ? "The refund has changed since you opened this - a policy deadline passed. Check the new amounts below."
          : result.error,
      );
      if (result.preview) setPreview(result.preview);
    });
  }

  return (
    <>
      <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={openDialog}>
        {label}
      </Button>
      {open && (
        <Modal title={done ? "Cancelled" : withdrawing ? "Withdraw your request?" : `Cancel this ${noun}?`} onClose={close}>
          <div className="mt-4 space-y-4 text-sm">
            {done ? (
              <Cancelled record={done} onClose={close} />
            ) : !preview ? (
              <>
                {pending && <p className="text-ink-soft">Working out your refund…</p>}
                <FormNotice message={error ?? undefined} />
              </>
            ) : !hasTerms(preview) ? (
              <NotCancellable preview={preview} onClose={close} />
            ) : (
              <>
                {preview.tier_label && <p className="text-ink">{preview.tier_label}.</p>}
                <dl className="divide-y divide-line border-y border-line">
                  {cancellationLines(preview).map((line) => (
                    <div
                      key={line.label}
                      className={`flex justify-between gap-4 py-2 ${line.tone === "total" ? "font-medium text-ink" : "text-ink-soft"}`}
                    >
                      <dt>{line.label}</dt>
                      <dd className={line.tone === "loss" ? "text-accent-dark" : undefined}>{formatMoney(line.cents)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-ink-soft">
                  {kind === "bundle" ? "Every item in the bundle is cancelled together. " : ""}
                  Refunds go to your wallet as available credit straight away. The dates open up for others.
                </p>
                <FormNotice message={error ?? undefined} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" disabled={pending} onClick={close}>
                    {withdrawing ? "Keep request" : "Keep booking"}
                  </Button>
                  <Button disabled={pending} onClick={() => confirm(preview.refund_cents)}>
                    {pending ? "Cancelling…" : withdrawing ? "Yes, withdraw" : "Yes, cancel"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function NotCancellable({ preview, onClose }: { preview: CancellationPreview; onClose: () => void }) {
  return (
    <>
      {preview.reason === "BOOKING_ACTIVE" && <p className="font-medium text-ink">This rental has already started.</p>}
      <p className="text-ink-soft">{preview.message}</p>
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

function Cancelled({ record, onClose }: { record: CancellationRecord; onClose: () => void }) {
  return (
    <>
      <p className="text-ink">
        {formatMoney(record.total_back_to_wallet_cents)} is back in your wallet as available credit
        {record.non_refundable_cents > 0 && `; ${formatMoney(record.non_refundable_cents)} was not refundable under the policy`}.
      </p>
      <div className="flex justify-end gap-2">
        <Link href={profilePath("wallet")} className="self-center text-sm underline" onClick={onClose}>
          View wallet
        </Link>
        <Button onClick={onClose}>Done</Button>
      </div>
    </>
  );
}
