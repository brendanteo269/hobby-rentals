"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { changeBundleBookingStatus } from "@/app/bookings/actions";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/bookings";
import type { BundleBooking } from "@/lib/bundles";
import { formatDate, formatMoney } from "@/lib/format";

/** Same ladder the single-listing list offers, so an owner learns one flow. */
const NEXT_ACTION: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  PENDING: { status: "CONFIRMED", label: "Confirm" },
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
  const [items, setItems] = useState(bookings);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(bundleBookingId: string, nextStatus: BookingStatus) {
    startTransition(async () => {
      const result = await changeBundleBookingStatus(bundleBookingId, nextStatus);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setItems((current) =>
        current.map((item) => (item.id === result.booking.id ? result.booking : item)),
      );
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
                  {formatDate(booking.start_date)} – {formatDate(booking.end_date)}{" "}
                  <span className="text-ink-soft">· {BOOKING_STATUS_LABELS[booking.status]}</span>
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
                  {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      disabled={isPending}
                      onClick={() => update(booking.id, "CANCELLED")}
                    >
                      Decline
                    </Button>
                  )}
                </span>
              </div>
              {/* Which items the decision covers - the whole point of a bundle
                  request, and not obvious from the dates alone. */}
              <p className="mt-1 text-xs text-ink-soft">
                Covers all {booking.items.length} items:{" "}
                {booking.items.map((item) => item.listing_name ?? "an item").join(", ")}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
