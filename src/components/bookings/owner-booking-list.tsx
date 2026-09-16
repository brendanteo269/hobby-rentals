"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { changeBookingStatus, type BookingActionResult } from "@/app/bookings/actions";
import { BOOKING_STATUS_LABELS, type Booking, type BookingStatus } from "@/lib/bookings";
import { formatDate } from "@/lib/format";

const NEXT_ACTION: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  PENDING: { status: "CONFIRMED", label: "Confirm" },
  CONFIRMED: { status: "ACTIVE", label: "Start rental" },
  ACTIVE: { status: "COMPLETED", label: "Mark returned" },
};

export function OwnerBookingList({ bookings }: { bookings: Booking[] }) {
  const [items, setItems] = useState(bookings);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(bookingId: string, nextStatus: BookingStatus) {
    startTransition(async () => {
      const result: BookingActionResult = await changeBookingStatus(bookingId, nextStatus);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setItems((current) => current.map((item) => item.id === result.booking.id ? result.booking : item));
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
          return <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 bg-surface-muted px-3 py-2 text-sm">
            <span>{formatDate(booking.start_date)} – {formatDate(booking.end_date)} <span className="text-ink-soft">· {BOOKING_STATUS_LABELS[booking.status]}</span></span>
            <span className="flex gap-2">
              {next && <Button className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => update(booking.id, next.status)}>{next.label}</Button>}
              {(booking.status === "PENDING" || booking.status === "CONFIRMED") && <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={isPending} onClick={() => update(booking.id, "CANCELLED")}>Decline</Button>}
            </span>
          </li>;
        })}
      </ul>
    </div>
  );
}
