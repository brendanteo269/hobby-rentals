"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FormError, Modal, SelectField, TextareaField } from "@/components/ui";
import { changeBookingStatus, declineRequest } from "@/app/bookings/actions";
import { DECLINE_REASON_LABELS, type DeclineReason } from "@/lib/bookings";

const REASONS = Object.keys(DECLINE_REASON_LABELS) as DeclineReason[];

/** The owner's Approve and Decline on a request they are reviewing. */
export function BookingRequestDecision({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<DeclineReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function decide(action: () => ReturnType<typeof declineRequest>) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/listings/mine/bookings");
    });
  }

  function submitDecline(event: React.FormEvent) {
    event.preventDefault();
    if (!reason) return setError("Choose a reason for declining.");
    if (reason === "OTHER" && !note.trim()) return setError("Tell the renter why you are declining.");
    decide(() => declineRequest(bookingId, reason, reason === "OTHER" ? note.trim() : null));
  }

  return (
    <div className="space-y-3">
      {!declining && <FormError message={error} />}
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={() => decide(() => changeBookingStatus(bookingId, "CONFIRMED"))}>
          Approve request
        </Button>
        <Button variant="outline" disabled={isPending} onClick={() => { setError(undefined); setDeclining(true); }}>
          Decline
        </Button>
      </div>

      {declining && (
        <Modal title="Decline this request" onClose={() => setDeclining(false)}>
          <form className="mt-6 space-y-5" onSubmit={submitDecline}>
            <p className="body-copy">The renter is told your reason, and their wallet hold is released in full.</p>
            <SelectField
              id="decline-reason"
              label="Reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value as DeclineReason)}
            >
              <option value="" disabled>Choose a reason</option>
              {REASONS.map((value) => <option key={value} value={value}>{DECLINE_REASON_LABELS[value]}</option>)}
            </SelectField>
            {reason === "OTHER" && (
              <TextareaField
                id="decline-note"
                label="Tell the renter why"
                hint="They see this in their notification."
                required
                maxLength={500}
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            )}
            <FormError message={error} />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDeclining(false)}>Keep reviewing</Button>
              <Button type="submit" disabled={isPending}>Decline request</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
