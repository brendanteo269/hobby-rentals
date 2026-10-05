"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { changeBookingStatus, type BookingActionResult } from "@/app/bookings/actions";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS, type Booking, type BookingStatus } from "@/lib/bookings";
import { formatDate } from "@/lib/format";

const NEXT_ACTION: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  PENDING: { status: "CONFIRMED", label: "Confirm" },
  CONFIRMED: { status: "ACTIVE", label: "Start rental" },
  ACTIVE: { status: "COMPLETED", label: "Mark returned" },
};

/** Who asked, for an owner reading a list of requests on one listing. */
export function requesterName(booking: Pick<Booking, "renter_name">): string {
  return booking.renter_name || "A renter";
}

export function OwnerBookingList({ bookings }: { bookings: Booking[] }) {
  // Only the rows this list has itself changed are held locally; the rest
  // come straight from props on every render. Seeding state from `bookings`
  // instead would freeze the list at whatever it held when the component
  // first mounted, so a request that arrived afterwards - the next renter's,
  // once a booking is cancelled - would never appear.
  const [changed, setChanged] = useState<Record<string, Booking>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const items = bookings.map((booking) => changed[booking.id] ?? booking);

  function update(bookingId: string, nextStatus: BookingStatus) {
    startTransition(async () => {
      const result: BookingActionResult = await changeBookingStatus(bookingId, nextStatus);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setChanged((current) => ({ ...current, [result.booking.id]: result.booking }));
    });
  }

  if (items.length === 0) return <p className="mt-2 text-xs text-ink-soft">No booking requests yet.</p>;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="eyebrow">Booking requests</p>
      {error && <p role="alert" className="mt-2 text-xs text-accent-dark">{error}</p>}
      <ul className="mt-2 space-y-2">
        {items.map((booking) => {
          const next = NEXT_ACTION[booking.status];
          return (
            <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 bg-surface-muted px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{requesterName(booking)}</span>{" "}
                <span className="text-ink-soft">
                  · {formatDate(booking.start_date)} – {formatDate(booking.end_date)} ·{" "}
                  {BOOKING_STATUS_LABELS[booking.status]}
                  {booking.payment_status && ` · ${PAYMENT_STATUS_LABELS[booking.payment_status]}`}
                </span>
              </span>
              <span className="flex gap-2">
                {next && (
                  <Button className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => update(booking.id, next.status)}>
                    {next.label}
                  </Button>
                )}
                {/* Turning down a request and cancelling a booking already
                    agreed are different acts: they are separate transitions,
                    send different notifications, and only the second is a
                    CANCELLED. Collapsing them would also be refused - an
                    owner may not move a PENDING booking to CANCELLED, which
                    is the renter's own withdrawal. */}
                {booking.status === "PENDING" && (
                  <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => update(booking.id, "DECLINED")}>
                    Decline
                  </Button>
                )}
                {booking.status === "CONFIRMED" && (
                  <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => update(booking.id, "CANCELLED")}>
                    Cancel booking
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
