"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldPlus } from "lucide-react";
import { Button, FormNotice } from "@/components/ui";
import {
  acceptDepositOffer,
  declineDepositOffer,
  offerHigherDepositOn,
} from "@/app/bookings/actions";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { DepositOffer } from "@/lib/booking-risk";

/**
 * S6-05 Scenario 3: the owner's third option, and the renter's answer to it.
 *
 * One component for both sides because it is one conversation, and keeping
 * the wording together is what stops the two halves describing different
 * amounts. Which side is reading decides what it offers.
 *
 * The request stays pending throughout. Nothing is held until the renter
 * agrees, and the owner is told that plainly - an owner who thinks they
 * have accepted would stop looking for other bookings on those dates.
 */
export function HigherDepositOffer({
  bookingId,
  offer,
  depositCents,
  side,
}: {
  bookingId: string;
  offer?: DepositOffer | null;
  /** The deposit as the booking currently stands. */
  depositCents: number;
  side: "owner" | "renter";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function act(action: () => Promise<{ error: string } | object>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) setError(result.error as string);
      else router.refresh();
    });
  }

  // Already answered, or lapsed. Nothing to offer and nothing to decide.
  if (offer && offer.status !== "PENDING") return null;

  if (!offer) {
    // Only the owner can start this, and only while they still hold the
    // decision.
    if (side !== "owner") return null;
    return (
      <div className="mt-4">
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => act(() => offerHigherDepositOn(bookingId))}
        >
          <ShieldPlus className="mr-1.5 size-4" aria-hidden />
          {isPending ? "Offering…" : `Accept with increased ${formatMoney(depositCents * 2)} deposit`}
        </Button>
        <p className="mt-2 text-sm text-ink-soft">
          Doubles the deposit to {formatMoney(depositCents * 2)}. The renter has to agree before
          the booking is confirmed, so nothing is held until they do.
        </p>
        <FormNotice message={error ?? undefined} />
      </div>
    );
  }

  const raisedTo = depositCents + offer.extra_deposit_cents;

  if (side === "owner") {
    return (
      <div className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-sm">
        <p className="font-medium text-ink">Waiting on the renter</p>
        <p className="body-copy mt-1">
          You offered to accept at a {formatMoney(raisedTo)} deposit. They have until{" "}
          {formatDateTime(offer.respond_by)} to agree, and the booking is not confirmed until
          they do.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 card p-5">
      <p className="eyebrow">The owner&rsquo;s answer</p>
      <p className="mt-2 text-sm">
        The owner will take this booking at a higher security deposit:{" "}
        <span className="font-medium">{formatMoney(raisedTo)}</span> instead of{" "}
        {formatMoney(depositCents)}.
      </p>
      {/* The deposit is refundable, and a renter weighing this needs to know
          that before they weigh the amount. */}
      <p className="body-copy mt-2">
        That is {formatMoney(offer.extra_deposit_cents)} more held in your wallet. Agree by {formatDateTime(offer.respond_by)} or the
        request lapses.
      </p>

      <FormNotice message={error ?? undefined} />

      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={() => act(() => acceptDepositOffer(bookingId))}>
          {isPending ? "Confirming…" : `Agree and book at ${formatMoney(raisedTo)}`}
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => act(() => declineDepositOffer(bookingId))}
        >
          No thanks
        </Button>
      </div>
      {/* Said before they press it: declining ends the request, because
          there are no other terms on the table. */}
      <p className="mt-2 text-xs text-ink-soft">Declining withdraws your request.</p>
    </div>
  );
}
