"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { withdrawRequest } from "@/app/bookings/actions";

/**
 * Lets a renter take back a request the owner has not answered, releasing its
 * hold. Asks once before acting, since the dates may be gone if they change
 * their mind again.
 */
export function WithdrawRequestButton({ bookingId }: { bookingId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawRequest(bookingId);
      if ("error" in result) {
        setError(result.error);
        setConfirming(false);
      }
      // On success the action revalidates, and this booking re-renders as
      // withdrawn without this button.
    });
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setConfirming(true)}>
          Withdraw request
        </Button>
        {error && <p role="alert" className="text-xs text-accent-dark">{error}</p>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-soft">Withdraw and release your hold?</span>
      <Button className="px-3 py-1.5 text-xs" disabled={pending} onClick={withdraw}>
        {pending ? "Withdrawing…" : "Yes, withdraw"}
      </Button>
      <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => setConfirming(false)}>
        Keep it
      </Button>
    </div>
  );
}
