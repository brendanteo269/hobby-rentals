"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, FormNotice, Notice } from "@/components/ui";
import { settleOverdue } from "@/app/overdue/actions";
import { formatMoney } from "@/lib/format";
import { profilePath } from "@/lib/routes";
import type { SuspensionStatus } from "@/lib/overdue";

/**
 * S3-18 Scenario 3: what a suspended renter sees, and how they get out of it.
 *
 * Suspension restricts booking but never login, so this banner is reachable -
 * which is the whole point: it is the only place the renter can settle what
 * they owe and lift the restriction themselves.
 *
 * Renders nothing when there is nothing owed, so it can sit unconditionally
 * at the top of the renter's view.
 */
export function SuspensionBanner({ status }: { status: SuspensionStatus }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [settling, startSettling] = useTransition();

  if (!status.suspended) return null;

  const stillOut = status.overdue_bookings.filter((booking) => booking.overdue_since);
  const owed = status.overdue_bookings.filter((booking) => booking.overdue_arrears_cents > 0);
  // The gross late fees, which is the figure each rental shows against itself
  // below. debt_cents is smaller - it is what is left once every deposit has
  // absorbed what it can - so leading with the total is what makes the banner
  // and the rentals under it agree.
  const totalFeesCents = status.overdue_bookings.reduce(
    (total, booking) => total + booking.overdue_fee_cents,
    0,
  );
  // Exact, not an estimate: each rental's fee is either met by its deposit or
  // split into the part the deposit met and the part it did not, so the two
  // always add back up to the total.
  const coveredByDepositCents = totalFeesCents - status.debt_cents;
  const rentals = status.overdue_bookings.length === 1 ? "this rental" : "your rentals";

  function settle() {
    setError(null);
    startSettling(async () => {
      const result = await settleOverdue();
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Notice className="mb-6">
      <p className="font-medium text-ink">New bookings are paused on your account</p>
      <p className="mt-2 text-sm text-ink">
        {formatMoney(totalFeesCents)} in late fees has built up on {rentals}.{" "}
        {coveredByDepositCents > 0 ? (
          <>
            The {formatMoney(coveredByDepositCents)} security deposit covers part of it, leaving{" "}
            {formatMoney(status.debt_cents)} for you to settle.
          </>
        ) : (
          <>There is no deposit left to cover it, so {formatMoney(status.debt_cents)} is yours to settle.</>
        )}
      </p>

      {stillOut.length > 0 && (
        <p className="mt-2 text-sm text-ink-soft">
          Item in question:{" "}
          {stillOut.map((booking, index) => (
            <span key={booking.id}>
              {index > 0 && ", "}
              <Link href={`/listings/${booking.listing_id}`} className="underline">
                {booking.listing_name ?? "an item"}
              </Link>
            </span>
          ))}
        </p>
      )}

      {owed.length > 0 ? (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            Settling pays the owner from your wallet. Top up first if your balance will not cover it.
          </p>
          <FormNotice message={error ?? undefined} />
          <div className="mt-3 flex gap-2">
            <Button disabled={settling} onClick={settle}>
              {settling ? "Settling…" : `Settle ${formatMoney(status.debt_cents)}`}
            </Button>
            <Link href={profilePath("wallet")} className="self-center text-sm underline">
              Top up wallet
            </Link>
          </div>
        </>
      ) : (
        /* Nothing is payable yet: the fees are still accruing against a
           rental that has not come back, so returning it is the only move. */
        <p className="mt-2 text-sm text-ink-soft">
          Return the {stillOut.length === 1 ? "item" : "items"} to settle up and stop the overdue fee from increasing and lift the suspension pause on your account.
        </p>
      )}
    </Notice>
  );
}
