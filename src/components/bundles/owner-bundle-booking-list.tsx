"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui";
import { changeBundleBookingStatus } from "@/app/bookings/actions";
import { requesterName } from "@/components/bookings/owner-booking-list";
import { ReportDamageButton } from "@/components/bookings/report-damage-button";
import { BOOKING_STATUS_LABELS, requestReviewPath, type BookingStatus } from "@/lib/bookings";
import type { BundleBooking } from "@/lib/bundles";
import { cancellationOutcomeLine, HANDED_OVER_NOTE } from "@/lib/cancellations";
import { formatDate, formatMoney } from "@/lib/format";
import { canReportDamage, settlementLine } from "@/lib/settlement";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

/**
 * Same ladder the single-listing list offers, so an owner learns one flow. A
 * request is answered from its review page, where declining needs a reason.
 */
const NEXT_ACTION: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  CONFIRMED: { status: "ACTIVE", label: "Start rental" },
  ACTIVE: { status: "COMPLETED", label: "Mark returned" },
};

/**
 * Bundle booking requests against one of the owner's sets.
 *
 * Mirrors OwnerBookingList, with one difference worth stating on screen: a
 * decision here moves every item in the set at once, because a bundle booking
 * reserved them together and confirming half of one would leave the renter
 * with gear that does not do the job they asked for.
 */
export function OwnerBundleBookingList({ bookings }: { bookings: BundleBooking[] }) {
  // Rows always come from props, refreshed after each change, as in
  // OwnerBookingList: the action's response lacks what the lists add.
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const items = bookings;

  function update(bundleBookingId: string, nextStatus: BookingStatus) {
    startTransition(async () => {
      const result = await changeBundleBookingStatus(bundleBookingId, nextStatus);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="mt-2 text-xs text-ink-soft">No booking requests yet.</p>;
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="eyebrow">Booking requests</p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-accent-dark">
          {error}
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {items.map((booking) => {
          const next = NEXT_ACTION[booking.status];
          return (
            <li key={booking.id} className="bg-surface-muted px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{requesterName(booking)}</span>{" "}
                  <span className="text-ink-soft">
                    · {formatDate(booking.start_date)} – {formatDate(booking.end_date)} ·{" "}
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </span>
                  {booking.total_amount_cents !== null && (
                    <span className="text-ink-soft"> · {formatMoney(booking.total_amount_cents)}</span>
                  )}
                </span>
                <span className="flex gap-2">
                  {next && (
                    <Button
                      className="px-3 py-1.5 text-xs"
                      disabled={isPending}
                      onClick={() => update(booking.id, next.status)}
                    >
                      {next.label}
                    </Button>
                  )}
                  {booking.status === "PENDING" && (
                    <ButtonLink href={requestReviewPath("BUNDLE", booking.id)} className="px-3 py-1.5 text-xs">
                      Review request
                    </ButtonLink>
                  )}
                  {booking.status === "CONFIRMED" && (
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      disabled={isPending}
                      onClick={() => update(booking.id, "CANCELLED")}
                    >
                      Cancel booking
                    </Button>
                  )}
                  {canReportDamage(booking.settlement_state) && booking.settlement_state?.claim_window_ends_at && (
                    <ReportDamageButton
                      id={booking.id}
                      windowEndsAt={booking.settlement_state.claim_window_ends_at}
                      items={booking.items}
                    />
                  )}
                </span>
              </div>
              {/* Which items the decision covers - the whole point of a bundle
                  request, and not obvious from the dates alone. */}
              <p className="mt-1 text-xs text-ink-soft">
                Covers all {booking.items.length} items:{" "}
                {booking.items.map((item) => item.listing_name ?? "an item").join(", ")}
              </p>
              {booking.status === "ACTIVE" && (
                <p className="mt-1 text-xs text-ink-soft">
                  {HANDED_OVER_NOTE} <a href={SUPPORT_MAILTO} className="underline">{SUPPORT_EMAIL}</a>
                </p>
              )}
              {booking.cancellation_outcome && (
                <p className="mt-1 text-xs text-ink-soft">{cancellationOutcomeLine(booking.cancellation_outcome, "owner")}</p>
              )}
              {booking.settlement_state && (
                <p className="mt-1 text-xs text-ink-soft">{settlementLine(booking.settlement_state, "owner")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
